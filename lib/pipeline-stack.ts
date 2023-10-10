import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as codecommit from 'aws-cdk-lib/aws-codecommit';
import * as pipelines from "aws-cdk-lib/pipelines";
import * as iam from "aws-cdk-lib/aws-iam";
import { CdkHandsonAppStage } from "./constructs/app-stage";
import { NagSuppressions } from 'cdk-nag';


export class CdkHandsonPipelineStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);


        // -----------------------------------------------------------
        // CodeCommit Repository
        // -----------------------------------------------------------
        const repository = new codecommit.Repository(this, 'CdkHandsonPipelineRepository', {
            repositoryName: "CdkHandsonPipelineRepository"
        });
        cdk.Tags.of(repository).add('Name', "CdkHandsonPipelineRepository");
        new cdk.CfnOutput(this, "CdkHandsonRepository", {
            value: repository.repositoryCloneUrlHttp,
        });


        // -----------------------------------------------------------
        // CodePipeline
        // -----------------------------------------------------------
        const pipeline = new pipelines.CodePipeline(this, 'CdkHandsonPipeline', {
            // pipelineName: 'CdkHandsonPipeline',  // Statekess Resourceなのでカスタム名を付けません。
            crossAccountKeys: true,
            enableKeyRotation: true,
            synth: new pipelines.CodeBuildStep('SynthStep', {
                    input: pipelines.CodePipelineSource.codeCommit(repository, 'master'),
                    installCommands: [
                        'npm install -g aws-cdk',

                    ],
                    commands: [
                        'npm ci',  // ci: package-lock.json から依存関係をインストール
                        'npm run build',
                        'npx cdk synth'
                    ],
                }
            )
        });
        cdk.Tags.of(pipeline).add('Name', "CdkHandsonPipeline");


        // -----------------------------------------------------------
        // Dev Stage 
        // -----------------------------------------------------------
        const appDevConstruct = new CdkHandsonAppStage(this, 'AppDevStage', {
            stage: 'dev',
        });
        const devStage = pipeline.addStage(appDevConstruct);

        // Step to test Publish Lambda function

        devStage.addPost(
            new pipelines.CodeBuildStep("TestPublishLambda", {
                projectName: "TestPublishLambda",
                envFromCfnOutputs: {
                    PUBLISH_LAMBDA_FUNCTION_NAME: appDevConstruct.publishLambdaFunctionName,
                },
                commands: [
                    "aws lambda invoke --function-name $PUBLISH_LAMBDA_FUNCTION_NAME out --output text"
                ],
                role: this.roleForStage()
            })
        );
        

        // -----------------------------------------------------------
        // Stg Stage 
        // -----------------------------------------------------------
        const appStgConstruct = new CdkHandsonAppStage(this, 'AppStgStage', {
            stage: 'stg',
        });
        const stgStage = pipeline.addStage(appStgConstruct);

        // Manual Approve
        stgStage.addPre(
            new pipelines.ManualApprovalStep("PromptToStg"),
        );

        // // -----------------------------------------------------------
        // // Prd Stage 
        // // -----------------------------------------------------------
        const appPrdConstruct = new CdkHandsonAppStage(this, 'AppPrdStage', {
            stage: 'prd',
        });
        const prdStage = pipeline.addStage(appPrdConstruct);

        prdStage.addPre(
            new pipelines.ManualApprovalStep("PromptToPrd"),
        );

        this.addPipelineStackNagSuppressions();

    }

    private roleForStage() {
        const invokeLambdaPolicyForStage = new iam.ManagedPolicy(this, "InvokeLambdaPolicyForStage", {
            managedPolicyName: "InvokeLambdaPolicyForStage",
            statements: [
                new iam.PolicyStatement({
                    actions: [
                        "lambda:InvokeFunction",
                        "lambda:ListFunctions",
                    ],
                    effect: iam.Effect.ALLOW,
                    resources: ["*"]
                })
            ]
        });
        const invokeLambdaRoleForStage = new iam.Role(this, "InvokeLambdaRoleForStage", {
            roleName: "InvokeLambdaRoleForStage",
            assumedBy: new iam.ServicePrincipal("codebuild.amazonaws.com"),
            description: "Invoke Lambda role for Stage",
            managedPolicies: [invokeLambdaPolicyForStage]
        });

        return invokeLambdaRoleForStage
    }

    private addPipelineStackNagSuppressions() {

        NagSuppressions.addStackSuppressions(this, [
            {
                id: "AwsSolutions-S1",
                reason: "Server Access Logging not required.",
            },
            {
                id: "AwsSolutions-IAM5",
                reason: "Wildcard permissions for CDK Pipelines resources are allowed.",
            }
        ]);
    }
}

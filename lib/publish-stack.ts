import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import { NagSuppressions } from "cdk-nag";


export interface IPublishProps  extends cdk.StackProps {
    stage: string;
};


export class PublishStack extends cdk.Stack {

  public readonly publishLambdaFunctionName: cdk.CfnOutput;

  constructor(scope: Construct, id: string, props: IPublishProps) {
    super(scope, id, props);

        // Publish Lambda function

        const cdkHandsonTopicArn = cdk.Fn.importValue(`CdkHandsonTopicArn-${props.stage}`)
    
        const publishFunction = new lambda.Function(this, "PublishFunction", {
            handler: "index.handler",
            runtime: lambda.Runtime.NODEJS_18_X,
            timeout: cdk.Duration.seconds(30),
            code: lambda.Code.fromAsset("src/lambdas/publish/"),
            environment: {
              TOPIC_ARN: cdkHandsonTopicArn,
            },
          });
      
          // SNS Topicへのpublish権限をLambda関数に与える
          publishFunction.addToRolePolicy(new iam.PolicyStatement({
            actions: ["sns:Publish"],
            resources: [cdkHandsonTopicArn],
          }));

          cdk.Tags.of(publishFunction).add("ResourceName", `publish-lambda-${props.stage}`);
          this.publishLambdaFunctionName = new cdk.CfnOutput(this, "publicLambdaFunctionName", {
            value: publishFunction.functionName,
          });
  

          NagSuppressions.addResourceSuppressions(
            publishFunction, 
            [
              {
                  id: "AwsSolutions-IAM4",
                  reason: "Suppress AwsSolutions-IAM4 for AWSLambdaBasicExecutionRole'",
                  appliesTo: [
                    'Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
                  ],
              }
            ],
            true,
          );

  }
}

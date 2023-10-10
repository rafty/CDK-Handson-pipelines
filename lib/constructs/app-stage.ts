import { CdkHandsonStack } from '../cdk-handson-stack';
import { PublishStack } from '../publish-stack';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { getStageConfig } from '../../stage-config';
import { IEnvironmentVariable } from '../../stage-config';


export interface ICdkHandsonAppStageProps extends cdk.StackProps {
    stage: string;
}


export class CdkHandsonAppStage extends cdk.Stage {

    public readonly publishLambdaFunctionName: cdk.CfnOutput;


    constructor(scope: Construct, id: string, props: ICdkHandsonAppStageProps) {
        super(scope, id, props);
        
        const stageVariables = getStageConfig(props.stage) as IEnvironmentVariable;

        const stackTky = new CdkHandsonStack(this, `CdkHandsonStack`, {
            env: stageVariables.env,
            stage: props.stage,
            visibilityTimeout: stageVariables.queue.visibilityTimeout,
        });
        
        const publishStack = new PublishStack(this, `PublishStack`, {
            env: stageVariables.env,
            stage: props.stage,
        }); 
        this.publishLambdaFunctionName = publishStack.publishLambdaFunctionName

        publishStack.node.addDependency(stackTky);

    }
}

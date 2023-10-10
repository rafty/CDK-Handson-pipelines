import * as cdk from 'aws-cdk-lib';
import {Construct} from "constructs";
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subs from 'aws-cdk-lib/aws-sns-subscriptions';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaEventsources from 'aws-cdk-lib/aws-lambda-event-sources'; 
import { NagSuppressions } from "cdk-nag";



export interface IPubSubProps {
    stage: string;
    visibilityTimeout: number;
}


export class PubSub extends Construct {

    constructor(scope: Construct, id: string, props: IPubSubProps) {
        super(scope, id);
				
		    // Queue

        const deadLetterQueue = new sqs.Queue(this, "CdkNagDlq", {
            // enforceSSL: true,  // ここをコメントアウトする
          });
      
      
        const queue = new sqs.Queue(this, 'CdkHandsonQueue', {
          visibilityTimeout: cdk.Duration.seconds(props.visibilityTimeout),
          retentionPeriod: cdk.Duration.seconds(1209600),
          deadLetterQueue: {
            maxReceiveCount: 3,
            queue: deadLetterQueue,
          },
          // enforceSSL: true,  // ここをコメントアウトする
        });
    
        cdk.Tags.of(queue).add("ResourceName", `pubsub-queue-${props.stage}`);


        // Topic
    
        const awsManagedKmsKey = kms.Alias.fromAliasName(this, "AwsManagedSnsKmsKey", "alias/aws/sns")
    
        const topic = new sns.Topic(this, "CdkHandsonTopic", {
          masterKey: awsManagedKmsKey,
        });
    
        cdk.Tags.of(topic).add("ResourceName", `pubsub-topic-${props.stage}`);

        topic.addSubscription(new subs.SqsSubscription(queue));
    
        // Topic ARNをOutout
        new cdk.CfnOutput(this, "CdkHandsonTopicAenOutput", {
          value: topic.topicArn,
          exportName: `CdkHandsonTopicArn-${props.stage}`,
        });

        // Lambda function
    
        const sqsTriggerFunction = new lambda.Function(this, "SqsTriggerFunction", {
          handler: "index.handler",
          runtime: lambda.Runtime.NODEJS_18_X,
          timeout: cdk.Duration.seconds(30),
          code: lambda.Code.fromAsset("src/lambdas/pubsub/"),
        });
    
        cdk.Tags.of(sqsTriggerFunction).add("ResourceName", `pubsub-lambda-${props.stage}`);
    

        NagSuppressions.addResourceSuppressions(
          sqsTriggerFunction, 
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
        
        sqsTriggerFunction.addEventSource(new lambdaEventsources.SqsEventSource(queue));

    }
}

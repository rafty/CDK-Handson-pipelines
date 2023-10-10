import * as cdk from 'aws-cdk-lib';
import { Template, Match, Annotations } from 'aws-cdk-lib/assertions';
import * as CdkHandson from '../lib/cdk-handson-stack';
import { AwsSolutionsChecks } from 'cdk-nag';


test('SQS Queue and SNS Topic Created', () => {
  const app = new cdk.App();
  // WHEN
  const stack = new CdkHandson.CdkHandsonStack(app, 'MyTestStack', {
    stage: "dev",
    visibilityTimeout: 300,
  });
  // THEN

  const template = Template.fromStack(stack);

  template.hasResourceProperties('AWS::SQS::Queue', {
    VisibilityTimeout: 300
  });
  template.resourceCountIs('AWS::SNS::Topic', 1);

});


test('SNS Topic Subscription', () => {

  const app = new cdk.App();
  const stack = new CdkHandson.CdkHandsonStack(app, 'MyTestStack', {
    stage: "dev",
    visibilityTimeout: 300,
  });
  const template = Template.fromStack(stack);


  template.hasResourceProperties('AWS::SNS::Subscription', {
      Protocol: 'sqs'
  });
  template.resourceCountIs('AWS::SNS::Subscription', 1);

});


test('cdk-nag AWS Solutions without unsuppressed Warnings or Errors', () => {

  const app = new cdk.App();
  const stack = new CdkHandson.CdkHandsonStack(app, 'MyTestStack', {
    stage: "dev",
      visibilityTimeout: 300,
  });

  cdk.Aspects.of(stack).add(new AwsSolutionsChecks());

  const warnings = Annotations.fromStack(stack).findWarning(
      '*',
      Match.stringLikeRegexp('AwsSolutions-.*')
  );

  const errors = Annotations.fromStack(stack).findError(
      '*',
      Match.stringLikeRegexp('AwsSolutions-.*')
  );

  expect(warnings).toHaveLength(0);
  expect(errors).toHaveLength(0);
});


test('Lambda function', () => {

  const app = new cdk.App();
  const stack = new CdkHandson.CdkHandsonStack(app, 'MyTestStack', {
    stage: "dev",
    visibilityTimeout: 300,
  });
  const template = Template.fromStack(stack);


  template.hasResourceProperties('AWS::Lambda::Function', {
      Handler: 'index.handler',
      Runtime: 'nodejs18.x',
      Timeout: 30,
  });

  template.resourceCountIs('AWS::Lambda::EventSourceMapping', 1);

});

// test('Tagging - Lambda Function ResourceName', () => {

//   const app = new cdk.App();
//   const stack = new CdkHandson.CdkHandsonStack(app, 'MyTestStack', {
//     stage: "dev",
//     visibilityTimeout: 300,
//   });
//   const template = Template.fromStack(stack);


//   template.hasResourceProperties('AWS::Lambda::Function',Match.objectLike({
//     Tags: Match.arrayWith([

//       Match.objectLike({
//         Key: "ResourceName",
//         Value: "pubsub-lambda-dev",  
//       }),
//     ])
//   }));

// });

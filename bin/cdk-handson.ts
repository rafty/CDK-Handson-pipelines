#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import * as nag from 'cdk-nag';
import { CdkHandsonPipelineStack } from '../lib/pipeline-stack';
import { getStageConfig } from '../stage-config';


const app = new cdk.App();
cdk.Tags.of(app).add("Name", "cdkhandson CI/CD Pipeline");

cdk.Aspects.of(app).add(new nag.AwsSolutionsChecks( { verbose: true })); // コメントアウト

const stageVariables = getStageConfig("cicd");

const pipeline = new CdkHandsonPipelineStack(app, 'CdkHandsonPipelineStack', {
    env: stageVariables.env,
});
cdk.Tags.of(pipeline).add('Name', "CdkHandsonPipeline");

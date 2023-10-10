const { PublishCommand, SNSClient } = require("@aws-sdk/client-sns");

const snsClient = new SNSClient();
const topicArn = process.env.TOPIC_ARN;  // 環境変数を取得

exports.handler = async function (event, context) {

    command = new PublishCommand({
        TopicArn: topicArn,
        Message: 'Hello!',
    });

    const response = await snsClient.send(command);
    console.log(response);

    return response;

};

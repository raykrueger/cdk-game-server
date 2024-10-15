import boto3
import os
import json
from nacl.signing import VerifyKey
from nacl.exceptions import BadSignatureError
from aws_xray_sdk.core import xray_recorder

cluster = os.environ.get("CLUSTER_ARN")
service = os.environ.get("SERVICE_ARN")
stateMachineArn = os.environ.get("STATE_MACHINE")
secrets_manager = boto3.client("secretsmanager")
ecs = boto3.client("ecs")
sfn = boto3.client("stepfunctions")

secret_name = os.environ.get("SECRET_NAME")
secrets = secrets_manager.get_secret_value(SecretId=secret_name)["SecretString"]
secrets = json.loads(secrets)

def go_away():
    return {
        "statusCode": 400,
        "headers": {"Content-Type": "text/plain"},
        "body": "wut?",
    }

@xray_recorder.capture()
def verify_request(signature, timestamp, body):
    verify_key = VerifyKey(bytes.fromhex(secrets["PublicKey"]))
    verify_key.verify(f"{timestamp}{body}".encode(), bytes.fromhex(signature))

@xray_recorder.capture()
def post(event):
    body = str(event["body"])
    request = json.loads(body)

    rtype = request["type"]
    print("Request Type:" + str(rtype))

    interaction_id = request["id"]
    interaction_token = request["token"]

    try:
        signature = event["headers"]["x-signature-ed25519"]
        timestamp = event["headers"]["x-signature-timestamp"]

        verify_request(signature, timestamp, body)
    except BadSignatureError:
        return {
            "statusCode": 401,
            "headers": {"Content-Type": "text/plain"},
            "body": "Invalid request signature",
        }

    if rtype == 1:
        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"type": 1}),
        }

    elif rtype == 2:
        sub_command = request["data"]["options"][0]["name"]

        execution_name = f"{interaction_id}"

        print("Starting State Machine")
        sfn.start_execution(
            stateMachineArn=stateMachineArn,
            name=execution_name,
            input=json.dumps(
                {
                    "InteractionId": interaction_id,
                    "InteractionToken": interaction_token,
                    "SubCommand": sub_command,
                }
            ),
        )
        return {
            "statusCode": 202,
            "headers": {"Content-Type": "application/json"},
            #"body": json.dumps( { "type": 5, })
        }
    else:
        return go_away()


def handler(event, context):
    if event["httpMethod"] == "POST":
        return post(event)
    return go_away()

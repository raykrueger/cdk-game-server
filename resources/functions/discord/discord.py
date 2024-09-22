import boto3
import os
import json
import hashlib
from nacl.signing import VerifyKey
from nacl.exceptions import BadSignatureError

cluster = os.environ.get("CLUSTER_ARN")
service = os.environ.get("SERVICE_ARN")
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


def is_server_up():
    response = ecs.describe_services(cluster=cluster, services=[service])
    count = response["services"][0]["runningCount"]
    return count > 0


def post(event):
    request = json.loads(event["body"])
    print("Request: " + json.dumps(request))

    verify_key = VerifyKey(bytes.fromhex(secrets["PublicKey"]))

    signature = event["headers"]["x-signature-ed25519"]
    timestamp = event["headers"]["x-signature-timestamp"]

    rtype = request["type"]
    print("Request Type:" + str(rtype))

    interaction_id = request["id"]
    interaction_token = request["token"]

    try:
        body = str(event["body"])
        verify_key.verify(f"{timestamp}{body}".encode(), bytes.fromhex(signature))
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

        h = hashlib.sha256()
        h.update(bytes(interaction_token, "utf-8"))
        execution_name = h.hexdigest()

        print("Starting State Machine")
        sfn.start_execution(
            stateMachineArn=os.environ.get("STATE_MACHINE"),
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
            "statusCode": 200,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps(
                {
                    "type": 5,
                }
            ),
        }
    else:
        return go_away()


def handler(event, context):
    print("Received event: " + json.dumps(event))
    if event["httpMethod"] == "POST":
        return post(event)
    return go_away()

import requests
import boto3
import json
import os

secrets_manager = boto3.client("secretsmanager")
secret_name = os.environ.get("SECRET_NAME")
secrets = secrets_manager.get_secret_value(SecretId=secret_name)["SecretString"]
secrets = json.loads(secrets)

app_id = secrets["AppId"]
authorization = secrets["Authorization"]


def handle(event, context):
    print("Received event: " + json.dumps(event))
    #interaction_id = event["InteractionId"]
    interaction_token = event["InteractionToken"]
    message = event["Discord"]["Message"]

    url = f"https://discord.com/api/v10/webhooks/{app_id}/{interaction_token}/messages/@original"
    
    headers = {
        "Authorization": authorization,
    }

    body = {
      "content": message
    }

    res = requests.patch(url, json=body, headers=headers)

    if not res.ok:
        print(f"ERROR: {res.text}") 
 
    res.raise_for_status()

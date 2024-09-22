import requests
import boto3
import json
import os

secrets_manager = boto3.client("secretsmanager")
secret_name = os.environ.get("SECRET_NAME")
secrets = secrets_manager.get_secret_value(SecretId=secret_name)["SecretString"]
secrets = json.loads(secrets)

app_id = secrets["AppId"]
bot_token = secrets["BotToken"]


def handle(event, context):
    print("Received event: " + json.dumps(event))
    interaction_token = event["InteractionToken"]
    message = event["Discord"]["Message"]
    url = f"https://discord.com/api/v10/webhooks/{app_id}/{interaction_token}/callback"
    headers = {"Authorization": f"Bot {bot_token}"}
    res = requests.post(url, json={"content": message}, headers=headers)
    res.raise_for_status()

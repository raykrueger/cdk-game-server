import requests
import boto3
import json
import os

secrets_manager = boto3.client("secretsmanager")

secret_name = os.environ.get("SECRET_NAME")
secrets = secrets_manager.get_secret_value(SecretId=secret_name)["SecretString"]
secrets = json.loads(secrets)

discord_api_version = "v10"

app_id = secrets["AppId"]
guild_id = secrets["GuildId"]
bot_token = secrets["BotToken"]

command_name = os.environ.get("COMMAND_NAME")

def on_create(event):
    url = f"https://discord.com/api/{discord_api_version}/applications/{app_id}/guilds/{guild_id}/commands"

    # This is an example USER command, with a type of 2
    blob = {
        "name": command_name,
        "type": 1,
        "description": "Game server commands",
        "default_permission": False,
        "options": [
            {
                "name": "status",
                "description": "Check the status of the server",
                "type": 1,
            },
            {
                "name": "start",
                "description": "Start the server, if it isn't running",
                "type": 1,
            },
            {
                "name": "stop",
                "description": "Stop the server, if it is running",
                "type": 1,
            },
        ],
    }

    # For authorization, you can use your bot token
    headers = {"Authorization": f"Bot {bot_token}"}

    r = requests.post(url, headers=headers, json=blob)
    r.raise_for_status()

    j = r.json()
    print(j)

    command_id = j["id"]

    return {"PhysicalResourceId": command_id}


def on_update(event):
    return on_create(event)


def on_delete(event):
    command_id = event["PhysicalResourceId"]
    url = f"https://discord.com/api/{discord_api_version}/applications/{app_id}/guilds/{guild_id}/commands/{command_id}"

    # For authorization, you can use your bot token
    headers = {"Authorization": f"Bearer {bot_token}"}

    r = requests.delete(url, headers=headers)
    print(r.status_code)
    # r.raise_for_status()
    return command_id


def on_event(event, context):
    print(event)
    request_type = event["RequestType"].lower()
    if request_type == "create":
        return on_create(event)
    if request_type == "update":
        return on_update(event)
    if request_type == "delete":
        return on_delete(event)
    raise Exception(f"Invalid request type: {request_type}")

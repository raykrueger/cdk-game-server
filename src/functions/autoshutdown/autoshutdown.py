import boto3
import json

ecs = boto3.client("ecs")


def handler(event, context):
    print(event)

    for r in event["Records"]:
        raw_message = r["Sns"]["Message"]
        message = json.loads(raw_message)
        dimensions = message["Trigger"]["Dimensions"]
        cluster = ""
        service = ""
        for d in dimensions:
            if d["name"] == "ServiceName":
                service = d["value"]
            if d["name"] == "ClusterName":
                cluster = d["value"]

        if service == "" or cluster == "":
            raise (
                f"Cluster and service are required! Cluster: {cluster}, Service: {service}"
            )

        print(f"Setting desired count to zero for service={service}")
        ecs.update_service(cluster=cluster, service=service, desiredCount=0)
        print("Done")

    return True

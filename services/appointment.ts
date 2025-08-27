import { APIGatewayProxyHandler } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns"

const client = new DynamoDBClient();
const clientSns = new SNSClient();
const TABLE = process.env.REGISTER_TABLE || "";
const TOPIC_ARN = process.env.TOPIC_ARN || "";

export const handler: APIGatewayProxyHandler = async (event) => {
    try {
        if (!event.body) {
            return { statusCode: 400, body: JSON.stringify({ message: "Body vacio" }) }
        }

        const body = JSON.parse(event.body);
        const { insuredId, scheduleId, countryISO } = body;
        if (!insuredId || !scheduleId || !countryISO) {
            return { statusCode: 400, body: JSON.stringify({ message: "Faltan campos requeridos" }) };
        }
        if (!/^\d{5}$/.test(body.insuredId)) {
            return { statusCode: 400, body: JSON.stringify({ message: "insuredId debe ser 5 dígitos" }) };
        }
        if (typeof body.scheduleId !== "number") {
            return { statusCode: 400, body: JSON.stringify({ message: "scheduleId debe ser número" }) };
        }
        if (!["PE", "CL"].includes(body.countryISO)) {
            return { statusCode: 400, body: JSON.stringify({ message: "countryISO inválido (PE o CL)" }) };
        }


        const newItem = {
            id: insuredId,
            scheduleId: scheduleId,
            countryISO: countryISO,
            createAt: new Date().toISOString(),
            modifyAt: null
        }
        const params = {
            TableName: TABLE,
            Item: newItem
        }
        await client.send(new PutCommand(params))
        await clientSns.send(new PublishCommand({ TopicArn: TOPIC_ARN, Message: JSON.stringify(newItem) }))

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Se creo el evento" })
        }

    } catch (error) {
        console.error("Error:", error)
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal server Error" })
        };
    }

}
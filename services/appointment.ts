import { APIGatewayProxyHandler } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns"

const client = new DynamoDBClient();
const TABLE = process.env.REGISTER_TABLE || "";

export const handler: APIGatewayProxyHandler = async (event) => {
    try {
        if (!event.body) {
            return { statusCode: 400, body: JSON.stringify({ message: "Body vacio" }) }
        }

        const body = JSON.parse(event.body);
        const { insuredId, scheduleId, countryISO } = body;
        if (!insuredId || !scheduleId || !countryISO) {
            if (!/^\d{5}$/.test(body.insuredId)) {
                return { statusCode: 400, body: JSON.stringify({ message: "insuredId debe ser 5 dígitos" }) };
            }
            if (typeof body.scheduleId !== "number") {
                return { statusCode: 400, body: JSON.stringify({ message: "scheduleId debe ser número" }) };
            }
            if (!["PE", "CL"].includes(body.countryISO)) {
                return { statusCode: 400, body: JSON.stringify({ message: "countryISO inválido (PE o CL)" }) };
            }
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
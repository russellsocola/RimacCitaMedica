import { APIGatewayProxyEvent } from "aws-lambda";
import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";

const TABLE = process.env.REGISTER_TABLE || "";
const client = new DynamoDBClient();

export const handler = async (event: APIGatewayProxyEvent) => {

    try {
        let lastKey;
        try {
            if (event.queryStringParameters?.lastKey) {
                lastKey = JSON.parse(decodeURIComponent(event.queryStringParameters.lastKey));
            }
        } catch (err) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "lastKey inválido" }),
            };
        }
        const params = {
            TableName: TABLE,
            Limit: 10,
            ExclusiveStartKey: lastKey
        }

        const command = new ScanCommand(params);
        const data = await client.send(command)

        console.log("Scan result:", { count: data.Count, lastKey: data.LastEvaluatedKey });

        return {
            statusCode: 200,
            body: JSON.stringify({
                items: data.Items,
                lastEvaluatedKey: data.LastEvaluatedKey ? 
                encodeURIComponent(JSON.stringify(data.LastEvaluatedKey)) : null
            }),
        };
    } catch (error) {

        console.log("Error: ", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Error al obtener datos con Paginacion", error: error.message })
        };

    }

}

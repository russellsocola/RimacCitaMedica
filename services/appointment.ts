import { APIGatewayProxyEvent, APIGatewayProxyResult, SQSEvent } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PutCommand, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns"

const client = new DynamoDBClient();
const clientSns = new SNSClient();
const TABLE = process.env.REGISTER_TABLE || "";
const TOPIC_ARN = process.env.TOPIC_ARN || "";

export const handler = async (event: SQSEvent | APIGatewayProxyEvent): Promise<APIGatewayProxyResult | void> => {
    if ("Records" in event) {
        // Viene de SQS
        for (const record of event?.Records) {
            console.log("Mensaje SQS:", JSON.parse(record.body));

            // Parsear el mensaje SNS dentro del SQS
            const sqsMessage = JSON.parse(record.body);
            const {  insuredId, scheduleId, countryISO, state, processedAt, processor } = sqsMessage.detail;

            if (!["pending", "completed"].includes(state)) {
                console.warn(`Estado inválido: ${state}`);
                continue;
            }
            //const newStatus = state;
            const getResult = await client.send(new GetCommand({
                TableName: TABLE,
                Key: { insuredId: insuredId },
            }));

            if (!getResult.Item) {
                console.error(`Id no encontrado: ${insuredId}`);
                continue;
            }

            try {
                const result = await client.send(
                    new UpdateCommand({
                        TableName: TABLE,
                        Key: { insuredId: insuredId },
                        UpdateExpression: "SET #st = :newStatus, modifyAt = :now",
                        ExpressionAttributeNames: {
                            "#st": "status",
                        },
                        ExpressionAttributeValues: {
                            ":newStatus": state,
                            ":now": new Date().toISOString(),
                        },
                        ReturnValues: "ALL_NEW",
                    })
                );

                console.log(result.Attributes)

                return {
                    statusCode: 200,
                    body: JSON.stringify({ Message: result })
                }
            } catch (error) {
                console.error("Error actualizando item:", error);
                throw error;
            }
        }
    } else {
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
                insuredId: insuredId,
                scheduleId: scheduleId,
                countryISO: countryISO,
                status: "pending",
                createAt: new Date().toISOString(),
                modifyAt: null
            }
            const params = {
                TableName: TABLE,
                Item: newItem
            }
            await client.send(new PutCommand(params))
            await clientSns.send(new PublishCommand({
                TopicArn: TOPIC_ARN,
                Message: JSON.stringify(newItem),
                MessageAttributes: {
                    country: {
                        DataType: 'String',
                        StringValue: countryISO
                    }
                }
            }))

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

}
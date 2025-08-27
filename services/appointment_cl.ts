import { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge";
import { SQSEvent } from "aws-lambda";
import mysql from "mysql2/promise";

const client = new EventBridgeClient({});

const DB_HOST = process.env.DB_HOST || "";
const DB_USER = process.env.DB_USER || "";
const DB_PASSWORD = process.env.DB_PASSWORD || "";
const DB_NAME = process.env.DB_NAME || "";

export const handler= async (event:SQSEvent) => {
    let connection;

    try {
        // Conexión al RDS
        connection = await mysql.createConnection({
            host: DB_HOST,
            user: DB_USER,
            password: DB_PASSWORD,
            database: DB_NAME,
        });

        for (const record of event.Records) {
            const body = JSON.parse(record.body);

            console.log("📩 Mensaje recibido de SQS:", body);

            const { insuredId, scheduleId, countryISO } = body;

            await connection.execute(
                "INSERT INTO appointments_cls (insured_id, schedule_id, country_iso, created_at) VALUES (?, ?, ?, NOW())",
                [insuredId, scheduleId, countryISO]
            );

            const command = new PutEventsCommand({
                Entries: [
                    {
                        Source: "app.citamedica",
                        DetailType: "AppointmentCreated",
                        Detail: JSON.stringify(body),
                        EventBusName: process.env.EVENT_BUS || "default",
                    },
                ],
            });

            const response = await client.send(command);

            console.log("Evento publicado:", response);
            return {
                statusCode: 200,
                body: JSON.stringify({ message: "Evento publicado en EventBridge" }),
            };
        }
    } catch (error) {
        console.error("Error:", error)
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal server Error" })
        };
    }
}
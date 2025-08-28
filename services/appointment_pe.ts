import { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge";
import { SQSEvent } from "aws-lambda";
import mysql from "mysql2/promise";

const client = new EventBridgeClient({});

const DB_HOST = process.env.DB_HOST || "";
const DB_USER = process.env.DB_USER || "";
const DB_PASSWORD = process.env.DB_PASSWORD || "";
const DB_NAME = process.env.DB_NAME || "";

export const handler = async (event: SQSEvent) => {
    let connection;

    try {
        try {
            // Intentar conexión al RDS
            connection = await mysql.createConnection({
                host: DB_HOST,
                user: DB_USER,
                password: DB_PASSWORD,
                database: DB_NAME,
            });
        } catch (err) {
            console.error("No se pudo conectar a DB:", err.message);
            connection = null; // Seguimos sin DB
        }

        for (const record of event.Records) {
            const snsMessage = JSON.parse(record.body);
            const appointmentData = JSON.parse(snsMessage.Message);

            console.log("Mensaje recibido de SQS:", appointmentData);

            const { insuredId, scheduleId, countryISO } = appointmentData;

            if (countryISO !== "PE") {
                console.log(`Mensaje ignorado - País: ${countryISO}, esperado: PE`);
                continue;
            }
            try {
                await connection.execute(
                    "INSERT INTO appointments_pe (insured_id, schedule_id, country_iso, created_at) VALUES (?, ?, ?, NOW())",
                    [insuredId, scheduleId, countryISO]
                );
            } catch (err) {
                continue;
            }

            const command = new PutEventsCommand({
                Entries: [
                    {
                        Source: "app.citamedica",
                        DetailType: "AppointmentProccess",
                        Detail: JSON.stringify({
                            insuredId,
                            scheduleId,
                            countryISO,
                            state: "completed",
                            processedAt: new Date().toISOString(),
                            processor: "PE_Consumer"
                        }),
                        EventBusName: process.env.EVENT_BUS || "default",
                    },
                ],
            });

            const response = await client.send(command);

            console.log("Evento publicado:", response);
        }
        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Evento publicado en EventBridge" }),
        };
    } catch (error) {
        console.error("Error:", error)
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal server Error" })
        };
    } finally {
        if (connection) {
            await connection.end();
        }
    }

}
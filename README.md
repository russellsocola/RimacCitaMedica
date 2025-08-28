# 🏥 CitaMedica API  
**Sistema serverless para gestión de citas médicas con arquitectura *event-driven* en AWS.**

---

## 🏗️ Arquitectura  

```text
API Gateway → Lambda → DynamoDB
                ↓
            SNS Fan-out
          ↙           ↘
    SQS PE          SQS CL
      ↓               ↓  
  MySQL PE      MySQL CL
      ↓               ↓
    EventBridge Processing
🚀 Stack
Runtime: Node.js 20.x + TypeScript

Framework: Serverless Framework

Bases de datos: DynamoDB + MySQL

Mensajería: SNS, SQS, EventBridge

Cloud: AWS

📋 API Endpoints
Crear Cita
http
Copiar código
POST /register
Content-Type: application/json

{
  "insuredId": "12345",
  "scheduleId": 101,
  "countryISO": "PE"
}
Listar Citas (con paginación)
http
Copiar código
GET /list?status=pending&countryISO=PE&limit=10
🔧 Setup Rápido
bash
Copiar código
# Instalar dependencias
npm install

# Desplegar
sls deploy --stage dev
🌍 Variables de Entorno
bash
Copiar código
DB_HOST=your-mysql-host
DB_USER=your-username  
DB_PASSWORD=your-password
DB_NAME=appointments
EVENT_BUS=default
REGISTER_TABLE=AppointmentsTable
🔄 Flujo de Procesamiento
POST /register → Guarda en DynamoDB

SNS Fan-out → Distribuye por país (PE / CL)

SQS Consumers → Procesan e insertan en MySQL

EventBridge → Publica estado actualizado

GET /list → Consulta DynamoDB con paginación

📊 Estructura de Datos
DynamoDB
ts
Copiar código
{
  id: string;           // insuredId (PK)
  scheduleId: number;
  countryISO: "PE" | "CL";
  status: "pending" | "completed";
  createAt: string;
  modifyAt: string;
}
🔐 Características
✅ Event-Driven Architecture con SNS + SQS

✅ Multi-país con filtros SNS

✅ Paginación automática en DynamoDB

✅ Validaciones estrictas

✅ End-to-end TypeScript

✅ Principio de menor privilegio (IAM)

📚 Scripts
bash
Copiar código
npm run build   # Compilar TypeScript
npm run deploy  # Desplegar a AWS
npm test        # Ejecutar tests
🚨 Monitoreo
CloudWatch Logs → Debugging

DynamoDB Metrics → Performance

SQS Dead Letter Queues → Resiliencia en producción
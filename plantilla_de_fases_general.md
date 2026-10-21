# Plantilla de Desarrollo Iterativo (Universal)

*Esta es la guía base que el agente `arquitecto-software-pro` adaptará para cualquier proyecto. Puedes modificarla según la escala de tu desarrollo.*

## 🛠️ FASE 1: Setup, Infraestructura y Autenticación Base
*Objetivo: Tener la aplicación corriendo y los usuarios gestionados.*
* **Checklist Inicial:** Comandos de instalación (npm, pip, composer, etc.) y variables de entorno (`.env`).
* **Base de Datos:** Configuración de la conexión real (PostgreSQL, MySQL, MongoDB) y el modelo de usuario principal.
* **Backend:** Endpoints de registro y login reales (JWT o Sesiones).
* **Frontend:** Configuración del proyecto, conexión con la API y vistas funcionales (pero sin estilo detallado aún) de Login/Registro.

## 🗄️ FASE 2: Entidades Core y CRUD Principal
*Objetivo: Crear el corazón del negocio (Ej: Productos, Tareas, Facturas).*
* **Backend:** Modelos de base de datos para las entidades principales.
* **API:** Endpoints protegidos (CRUD completo).
* **Manejo de Errores:** Controladores que respondan correctamente a 400, 401, 403 y 404.
* **Prueba:** El usuario debe confirmar que Postman/Swagger funciona antes de pasar al frontend.

## 🎨 FASE 3: Frontend Estilizado y Consumo de API
*Objetivo: Interfaz de usuario real basada en la elección de diseño del usuario.*
* **Estilos:** Configuración del framework elegido por el usuario (Tailwind, MUI, Bootstrap, etc.).
* **Componentes:** Creación de tablas, tarjetas o listas que consuman los endpoints de la Fase 2.
* **Seguridad:** Middleware en el frontend para proteger rutas privadas si el token expira o no existe.
* **Gestión de Estado:** (Redux, Zustand, Context API, React Query) según se requiera para manejar los datos.

## ⚙️ FASE 4: Lógica de Negocio Compleja o Integraciones
*Objetivo: Funcionalidades avanzadas (Pagos, WebSockets, Reportes).*
* Implementación de la lógica específica del proyecto (Ej: Carrito de compras, chat en tiempo real, generación de PDFs).
* Integración de APIs de terceros (Stripe, AWS S3, SendGrid, etc.).
* Funcionalidad completa probada de extremo a extremo.

## 🚀 FASE 5: Refinamiento, Testing y Producción
*Objetivo: Preparar el software para el mundo real.*
* **UX/UI:** Estados de carga (loaders), manejo de errores amigable en pantalla, notificaciones (toast).
* **Seguridad:** CORS estricto, Rate Limiting, validación de inputs (Zod, Joi).
* **Documentación:** Archivo `README.md` final con instrucciones de despliegue (Docker, Vercel, Render, etc.).
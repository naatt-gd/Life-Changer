![Icono de Reformándome](icon-192.png)

# ✦ Reformándome

### 66 días para construir hábitos que se adaptan a tu vida

**Bienestar · Entrenamiento · Nutrición · Emociones · Organización · Progreso**

**Reformándome** es una aplicación web instalable (PWA) que combina planificación personal y seguimiento del bienestar con una estética de fantasía nocturna. Su objetivo es acompañar pequeños cambios sostenibles, también cuando los horarios y las circunstancias varían.

> **Estado:** proyecto en desarrollo y pruebas con un grupo reducido. Todavía no está publicado como aplicación nativa en Google Play ni App Store.

## Funciones principales

| Apartado | Qué puedes hacer |
| --- | --- |
| **Inicio** | Ver el plan del día y las misiones pendientes. |
| **Hábitos y misiones** | Registrar hábitos, personalizarlos desde Ajustes y ganar experiencia (XP). |
| **Mi perfil** | Consultar tu personaje, nivel, progreso y opciones desbloqueadas. |
| **Heroína de fantasía** | Elegir entre cuatro colores de cabello y desbloquear vestimentas y alas dentro de la elección inicial. |
| **Entrenamiento** | Ver rutinas orientativas según objetivos, experiencia, material, disponibilidad y turnos. |
| **Nutrición** | Consultar menús que avanzan por fecha, sustituir platos y registrar comidas y agua. |
| **Lista de la compra** | Generar la compra semanal desde el menú, marcar productos, añadir otros y exportar un archivo de texto. |
| **Calendario** | Registrar mañanas, tardes, noches, trabajo, días libres, bajas y vacaciones, con horas e importación ICS/CSV compatible. |
| **Emociones** | Seleccionar un estado de ánimo diario, ver frases adaptadas y consultar la gráfica mensual. |
| **Progreso** | Consultar la evolución del peso y otros registros. |
| **Actualizar plan** | Modificar preferencias y circunstancias sin repetir todo el cuestionario inicial. |

## Primeros pasos

1. **Elige tu heroína** y completa el cuestionario de inicio.
2. **Consulta los planes** propuestos de hábitos, entrenamiento y alimentación.
3. **Registra tu día**, incluidos hábitos, comidas, agua y estado de ánimo.
4. **Adapta tu calendario y preferencias** cuando cambien tus horarios u objetivos.
5. **Sigue tu evolución** desde Mi perfil y Progreso.

## Instalar y guardar el progreso

Reformándome se abre desde su **dirección de GitHub Pages**. Para añadirla a la pantalla de inicio: en **Safari (iPhone)**, usa *Compartir → Añadir a pantalla de inicio*; en **Chrome (Android)**, busca *Instalar aplicación* o *Añadir a pantalla de inicio*, si está disponible.

Los datos se guardan inicialmente **en el navegador y dispositivo que utilizas**. En Ajustes puedes exportar una copia de seguridad JSON, recomendable antes de actualizar o cambiar de móvil. Existe código para la **sincronización opcional con Supabase**, pero no funciona en la nube hasta configurar y comprobar un proyecto propio.

## Aviso importante

La alimentación y los entrenamientos son **orientaciones generales**, no dietas clínicas, tratamientos ni planes de rehabilitación. Las alergias, condiciones médicas, embarazo y otras necesidades especiales requieren valoración profesional; ningún filtro garantiza ausencia de trazas de alérgenos. El seguimiento del estado de ánimo no sirve para diagnosticar ni tratar problemas de salud mental.

## Información técnica

- **Tecnología:** HTML, CSS y JavaScript; PWA publicada con GitHub Pages.
- **Idioma:** español.
- **Sincronización:** Supabase opcional; requiere configuración y pruebas.
- **Privacidad:** no publiques contraseñas, datos personales de otros usuarios ni claves privadas en el repositorio. `cloud-config.js` solo debe contener datos públicos autorizados para el navegador; nunca una clave `service_role` ni `secret`.

Este proyecto sigue en desarrollo y algunas funciones necesitan validación adicional en dispositivos reales antes de su difusión general.

---

**Reformándome · Pequeños pasos, grandes cambios. ✦**

# 1. BASE: "Comprar la cocina"
FROM maven:3.9.9-eclipse-temurin-17 AS build
# "Usa una cocina con Maven 3.9.9 y Java 17 instalados"

# 2. PREPARAR: "Organizar la cocina"
WORKDIR /app
# "Trabajar en el área /app de la cocina"

# 3. INGREDIENTES: "Poner los ingredientes en la mesa"
COPY pom.xml .
# "Primero solo el pom.xml (la lista de compras)"

# 4. PRE-COCINA: "Preparar herramientas"
RUN mvn dependency:go-offline -B
# "Descargar todas las dependencias ANTES (cache inteligente)"

# 5. MÁS INGREDIENTES: "Traer el resto"
COPY src ./src
# "Ahora traer todo el código fuente"

# 6. COCINAR: "Preparar el plato"
RUN mvn clean package -DskipTests
# "Compilar y empaquetar la aplicación (sin pruebas)"

# 7. PLATO FINAL: "Servir en plato limpio"
FROM eclipse-temurin:17-jre-alpine
# "Tomar un plato limpio (solo Java 17, más pequeño)"

# 8. PRESENTACIÓN: "Decorar el plato"
WORKDIR /app
# "Organizar el área de servicio"

# 9. TRANSPORTAR: "Poner la comida en el plato"
COPY --from=build /app/target/siiga2-web-0.0.1-SNAPSHOT.jar app.jar
# "Tomar solo el JAR final del paso 6"

# 10. ETIQUETA: "Indicar cómo se sirve"
EXPOSE 8080
# "Este plato se sirve por el puerto 8080"

# 11. INSTRUCCIONES: "Cómo consumirlo"
ENTRYPOINT ["sh", "-c", "java -Dserver.port=${PORT:-8080} -jar app.jar"]
# "Instrucciones finales: ejecutar Java con el puerto correcto"
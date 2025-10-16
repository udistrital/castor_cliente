# castor_cliente
✔️ Check: Cliente para los nuevos sistemas de la OAS.

## Especificaciones Técnicas

Este cliente base hace uso de la arquitectura Microfrontend planteada en la OAS para el desarrollo de aplicaciones web con el uso de nuevas tecnologías. En el archivo `index.html` se evidencia la inyección del script `webcomponent.js` que no es mas que un cliente angular precompilado que contiene las funcionalidades del header, footer, sidebar, autenticación y notificaciones. 
Para comenzar a desarrollar un nuevo proyecto realice los siguientes pasos:
- Clone este repositorio
- Ajuste el nombre de la aplicación a desarrollar reemplazando `castor-cliente` y `castor_cliente` en todo el proyecto
- Configure la carpeta con el repositorio nuevo
- Ajuste el nombre de la aplicación en environment cambiando el valor de las variables `appMenu` para cargar el menu de configuración y `appname` para cargar los logotivos correspondientes del [repositorio de assets](https://github.com/udistrital/assets).
- Ajuste el import de los estilos correspondientes al sistema en `styles.scss` reemplazando el nombre del sistema (ver [repositorio de assets](https://github.com/udistrital/assets)).  

### Tecnologías Implementadas y Versiones
* [Angular 12.2.16](https://angular.io/)
* [Angular Material 12.2.13](https://v12.material.angular.io/)
* [node 16.19.0](https://nodejs.org/es/download/releases/)

### Variables de Entorno
```shell
# En Pipeline
SLACK_AND_WEBHOOK: WEBHOOK ..
AWS_ACCESS_KEY_ID: llave de acceso ID Usuario AWS
AWS_SECRET_ACCESS_KEY: Secreto de Usuario AWS
```

### Ejecución del Proyecto

Clonar el proyecto del repositorio de git
```bash
# clone the project
git clone https://github.com/udistrital/castor_cliente.git
# enter the project directory
cd castor_cliente
```
Iniciar el servidor en local
```bash
# install dependency
npx npm install
or
npm install
# start server
npx ng serve
# Whenever you want to change the port just run
npx ng dev --port = 9528
```
Linter
```bash
# Angular linter
npm run lint
# run linter and auto fix
npm run lint:fix
# run linter on styles
npm run lint:styles
# run lint UI
npm run lint:ci
```

### Ejecución Dockerfile
```bash
# Does not apply
```
### Ejecución docker-compose
```bash
# Does not apply
```
### Ejecución Pruebas

Pruebas unitarias powered by Jest
```bash
# run unit test
npm run test
# Runt linter + unit test
npm run test:ui
```

## Estado CI

| Develop | Relese 0.0.1 | Master | Sonar |
| -- | -- | -- | -- |
| [![Build Status](https://hubci.portaloas.udistrital.edu.co/api/badges/udistrital/castor_cliente/status.svg?ref=refs/heads/develop)](https://hubci.portaloas.udistrital.edu.co/udistrital/castor_cliente) | [![Build Status](https://hubci.portaloas.udistrital.edu.co/api/badges/udistrital/castor_cliente/status.svg?ref=refs/heads/release/0.0.1)](https://hubci.portaloas.udistrital.edu.co/udistrital/castor_cliente) | [![Build Status](https://hubci.portaloas.udistrital.edu.co/api/badges/udistrital/castor_cliente/status.svg?ref=refs/heads/master)](https://hubci.portaloas.udistrital.edu.co/udistrital/castor_cliente) | [![Quality Gate Status](https://sonarqube.portaloas.udistrital.edu.co/api/project_badges/measure?project=udistrital%3Acastor_cliente&metric=alert_status)](https://sonarqube.portaloas.udistrital.edu.co/dashboard?id=udistrital%3Acastor_cliente) |

## Licencia

[This file is part of castor_cliente.](LICENSE)


castor_cliente is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (atSara Sampaio your option) any later version.

castor_cliente is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with castor_cliente. If not, see https://www.gnu.org/licenses/.


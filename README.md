Guia de Aventura — Ionic Vue + TypeScript

Aplicativo mobile desenvolvido com Ionic Vue 3, TypeScript, Capacitor, Leaflet e OpenStreetMap, criado para ajudar o usuário a explorar pontos turísticos próximos utilizando localização, mapa, bússola e cálculo de distâncias.

Desenvolvido por: Gustavo Maioli Rossetti Pereira

 Como executar o projeto

Primeiro, instale as dependências:

npm install

Depois, execute o projeto:

npm run dev

Para testar em um dispositivo físico, recomenda-se utilizar uma conexão HTTPS, permitindo o funcionamento correto dos recursos de geolocalização e dos sensores do aparelho.

Recursos do aplicativo
eolocalização: solicita permissão e acompanha continuamente a posição do usuário.
Mapa interativo: apresenta a localização atual e três pontos turísticos.
Bússola: utiliza o sensor de orientação do dispositivo para indicar as direções Norte, Sul, Leste e Oeste.
Cálculo de distância: calcula a distância entre o usuário e os pontos turísticos com base em suas coordenadas.
ℹ Detalhes dos locais: apresenta informações, imagens e dados sobre cada ponto turístico.
Rotas: permite abrir a localização do ponto turístico no Google Maps.
Perto de mim: filtra os pontos turísticos que estão dentro de um raio de 5 km da localização do usuário.
Tecnologias utilizadas
Ionic Vue 3
Vue.js
TypeScript
Capacitor
Leaflet
OpenStreetMap
Google Maps
 Objetivo

O objetivo do aplicativo é proporcionar uma experiência simples e interativa para que o usuário possa encontrar pontos turísticos próximos, visualizar suas localizações no mapa, consultar informações e descobrir rotas utilizando os recursos disponíveis no próprio dispositivo.

Autor

Gustavo Maioli Rossetti Pereira

Projeto desenvolvido para fins acadêmicos e de aprendizado em desenvolvimento de aplicativos mobile.
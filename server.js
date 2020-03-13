'use strict';

var express = require('express');
var mongo = require('mongodb');
var mongoose = require('mongoose');

var cors = require('cors');

/** Подключаем пакет body-parser, который 
позволяет получать из запроса данные форм **/
var bodyParser = require('body-parser');

/** Подключаем пакет dotenv, который делает
доступными переменные окружения из файла env **/
require('dotenv').config();

var app = express();

// Basic Configuration 
var port = process.env.PORT || 3000;

/** this project needs a db !! **/ 
/** Соединение с базой данных. Параметры подключения 
читаются из переменной окружения MONGOLAB_URI файла .env **/
mongoose.connect(process.env.MONGOLAB_URI, function (err) {
  //Если при соединении с БД происходит ошибка, то выбрасывается исключение, и все дальнейшее исполнение функции прерывается
  if (err) throw err;
  //Если соединение с БД выполнено успешно выводится сообщение 'БД подключена'
  console.log('БД подключена');
});

app.use(cors());

/** this project needs to parse POST bodies **/
// you should mount the body-parser here
app.use(bodyParser.urlencoded({extended: false}));

app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', function(req, res){
  res.sendFile(process.cwd() + '/views/index.html');
});

  
// your first API endpoint... 
app.get("/api/hello", function (req, res) {
  res.json({greeting: 'hello API'});
});


app.listen(port, function () {
  console.log('Node.js listening ...');
});
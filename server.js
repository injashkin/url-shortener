"use strict";

const express = require("express");
const mongo = require("mongodb");
const mongoose = require("mongoose");

var cors = require("cors");

/** Подключаем пакет body-parser, который 
извлекает из запроса данные форм **/
var bodyParser = require("body-parser");

/** Подключаем пакет dotenv, который делает
доступными переменные окружения из файла env **/
require("dotenv").config();

/** */
const dns = require("dns");

var app = express();

// Basic Configuration
var port = process.env.PORT || 3000;

/** this project needs a db !! **/

/** Соединение с базой данных. Параметры подключения 
читаются из переменной окружения MONGOLAB_URI файла .env **/
mongoose.connect(
  process.env.MONGOLAB_URI,
  { useNewUrlParser: true, useUnifiedTopology: true },
  function(err) {
    if (err) {
      console.log("Ошибка подключения к БД \n" + err);
    } else console.log("БД подключена");
  }
);

// Создаем схему списка URL-адресов,
// каждая запись в списке состоит из url-адреса и
// его сокращенного варианта shortUrl
var urlList = new mongoose.Schema({
  origUrl: { type: String },
  shortUrl: { type: Number }
});

//Создаем модель списка из схемы
var UrlList = mongoose.model("UrlList", urlList);

// Создаем схему счетчика, в котором храним последнее
// введенное значение count
var counter = new mongoose.Schema({
  count: { type: Number, default: 1 }
});
//Создаем модель счетчика из схемы
var Counter = mongoose.model("Counter", counter);

app.use(cors());

/** this project needs to parse POST bodies **/
// you should mount the body-parser here
app.use(bodyParser.urlencoded({ extended: false }));

app.use("/public", express.static(process.cwd() + "/public"));

app.get("/", function(req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

// your first API endpoint...
app.get("/api/hello", function(req, res) {
  res.json({ greeting: "hello API" });
});

// Обрабатываем POST-запрос формы из файла /views/index.html
app.post("/api/shorturl/new", function(req, res) {
  // Получаем url-адрес
  var url = req.body.url;
  /** Проверяем соответствие url-адреса формату 
  http(s)://www.example.com(/more/routes). Если
  url-адрес соответствует формату, то получаем 
  массив, который состоит из url-адреса и 
  доменного имени без протокола http(s):// */
  const urlAndDomainName = url.match(/^https?:\/\/([\da-z\.-]+)([\/\w \.-]*)/i);
  // Если url-адрес не соответствует формату
  if (!urlAndDomainName) {
    // Получаем ошибку
    return res.json({ error: "invalid URL" });
  }

  const domainName = urlAndDomainName[1];

  // Проверка с помощью сервиса DNS существования доменного имени
  dns.lookup(domainName, function(err, addr, family) {
    if (err) {
      // Если доменного имени не существует выводится сообщение об ошибке
      return res.json({ error: "Неправильное имя домена" });
    }

    // Доменное имя существует

    //Проверим URL-адрес в нашей базе данных.
    UrlList.findOne({ origUrl: url }, function(err, storedUrl) {
      if (err) return console.error(err);
      console.log("storedUrl: " + storedUrl);

      //Если в БД URL-адрес отсутствует, то сохраняем его
      if (!storedUrl) {
        console.log("storedUrl нет");
        let init = new UrlList({
          origUrl: url,
          shortUrl: getCounterAndIncrement
        });
        init.save(err => {
          if (err) return console.error(err);
        });
      }
      /**
      if (storedUrl) {
        // Если в БД домен с таким именем существует, то выводим в JSON-формате
        // URL-адрес и его сокращенный вариант
        return res.json({ original_url: url, short_url: storedUrl.shortUrl });
      }*/
      console.log("origUrl: " + UrlList.origUrl);

      // В БД нет домена с таким именем

      // Увеличиваем счетчик на единицу и записываем в БД URL-адрес
    });

    res.json([
      { url: url },
      { domainName: domainName },
      { err: err },
      { address: addr },
      { family: family }
    ]);
  });
});

app.listen(port, function() {
  console.log("Node.js listening ...");
});

function getCounterAndIncrement() {
  Counter.findOne({}, function(err, num) {
    if (err) return console.error(err);

    //Если в БД отсутствует count, то создаем ее
    if (!num) {
      let init = new Counter({ count: 1 });
      init.save(function(err, data) {
        if (err) return console.error(err);
        return data.count;
      });
    }

    num.count = num.count + 1;
    Counter.findOneAndUpdate({}, { count: num.count }, { new: true }, function(
      err,
      num
    ) {
      if (err) return console.error(err);
    });
  });
}

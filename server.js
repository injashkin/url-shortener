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
  err => {
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

app.get("/", (req, res) => {
  res.sendFile(process.cwd() + "/views/index.html");
});

// your first API endpoint...
app.get("/api/hello", (req, res) => {
  res.json({ greeting: "hello API" });
});

// Обрабатываем POST-запрос формы из файла /views/index.html
app.post("/api/shorturl/new", (req, res) => {
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
  dns.lookup(domainName, (err, addr, family) => {
    if (err) {
      // Если доменного имени не существует выводится сообщение об ошибке
      return res.json({ error: "Неправильное имя домена" });
    }

    // Доменное имя существует

    //Ищем URL-адрес в нашей базе данных.
    UrlList.findOne({ origUrl: url }, (err, storedUrl) => {
      if (err) return console.error(err);
      //Ищем счетчик в БД
      Counter.findOne({}, (err, num) => {
        if (err) return console.error(err);

        // Если URL-адрес в БД отсутствует
        if (!storedUrl) {
          //Если счетчик count в БД отсутствует, то создаем его
          if (!num) {
            num = new Counter({ count: 1 });
            num.save((err, data) => {
              if (err) return console.error(err);
            });
          } else {
            // В БД счетчик count присутствует. Увеличиваем ее на 1
            // и записываем в БД
            num.count = num.count + 1;
            num.save((err, data) => {
              if (err) return console.error(err);
            });
          }
          //сохраняем в БД URL-адрес и его короткий вариант,
          //который получаем из счетчика
          storedUrl = new UrlList({
            origUrl: url,
            shortUrl: num.count
          });
          storedUrl.save(err => {
            if (err) return console.error(err);
          });
        }
        // В БД URL-адрес существует. Выводим в JSON-формате
        // URL-адрес и его сокращенный вариант
        res.json({
          original_url: storedUrl.origUrl,
          short_url: storedUrl.shortUrl
        });
      });
    });
  });
});

//Обрабатываем GET-запрос, введенный в адресную строку браузера
//Запрос должен быть следующим:
//https://url-shortener-injashkin.glitch.me/api/shorturl/3
//где, после последнего слеша нужно указать любое число. Если
//такое число есть в БД, то осуществляется переход по
//соответствующему адресу.
app.get("/api/shorturl/:shorturl", (req, res) => {
  var shorturl = req.params.shorturl;
  //Проверяем на число выражение после последнего слеша
  if (!shorturl.match(/^[0-9]+$/)) {
    return res.json({ "ошибка": "Неправильный формат URL адреса" });    
  }

  UrlList.findOne({ shortUrl: shorturl }, (err, storedUrl) => {
    if(!storedUrl) {return res.json({"ошибка": "Для данного URL короткого адреса не существует" })}
    res.redirect(storedUrl.origUrl);
  });
});

app.listen(port, () => {
  console.log("Node.js listening ...");
});

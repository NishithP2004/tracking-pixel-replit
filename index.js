const express = require('express');
const morgan = require('morgan');
const UAParser = require('ua-parser-js');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const Database = require("@replit/database")
require('dotenv').config();
const db = new Database();

var data = {};
var parser = new UAParser();

const app = express();
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Listening on port: " + PORT);
})

app.use(morgan(":method :url :status - :remote-addr"))

app.get("/image", async (req, res) => {
  let subject, email, hash;
  ({ subject, email, hash } = req.query);
  console.log(req.headers)
  let user_agent = req.headers["user-agent"];
  parser.setUA(user_agent);
  let ip = req.headers["x-forwarded-for"], client = req.headers["x-requested-with"];
  let device = parser.getResult();

  if (checkIfNew(hash) == true) {
    let temp = {
      "Subject": subject,
      "Email": email,
      "Total Clicks": 0,
      "Logs": []
    }
    db.get("data").then(value => {
      data = value;
      data[hash] = temp;
      db.set("data", data).then(() => {
        res.sendFile(__dirname + '/tracker.png')
      });
    });

  } else {
    db.get("data")
      .then(value => {
        data = value;
        let log = {
          "IP": ip,
          "Email Client": client,
          "Date": new Date().toLocaleString("en-US", { timeZone: 'Asia/Kolkata' }),
          "Device": {
            name: `${device.device.vendor || ""} ${device.device.model || ""} ${device.device.type || ""}`,
            os: `${device.os.name} ${device.os.version}`,
            browser: `${device.browser.name} ${device.browser.version}`,
            engine: `${device.engine.name} ${device.engine.version}`,
            cpu: device.cpu.architecture
          }
        }
        data[hash]["Logs"].push(log)
        data[hash]["Total Clicks"] = data[hash]["Total Clicks"] + 1;

        /* await fetch(process.env.WEBHOOK_URL + "/email-tracker", {
          method: "POST",
          body: JSON.stringify(data[hash]),
          headers: {'Content-Type': 'application/json'}
        }) */

        db.set("data", data)
          .then(() => {
            res.sendFile(__dirname + '/tracker.png')
          })
      })
  }

})

app.get("/", (req, res) => {
  res.status(200).json({
    message: "Hello World"
  })
})

app.get("/data/:hash?", (req, res) => {
  db.get("data")
    .then(value => {
      data = value;

      if (req.params.hash) {
        if (data.hasOwnProperty(req.params.hash) == true)
          res.status(200).json(data[req.params.hash])
        else
          res.status(404).json({
            error: "No Data Found"
          })
      } else {
        res.status(200).json(data)
      }
    })
})

app.delete("/data/:hash?", (req, res) => {
  db.get("data")
    .then(value => {
      data = value;

      if (req.params.hash) {
        delete data[req.params.hash]
        db.set("data", data)
        .then(() => {
          res.status(200).json({
            success: true,
            hash: req.params.hash,
          })
        })
      } else {
        res.status(200).json({
          error: "Please provide a valid hash"})
      }
    })
})

function checkIfNew(hash) {
  let bool = false;
  db.get("data").then(value => {
    data = value;
    bool = data.hasOwnProperty(hash)
  })
    return bool
}
#!/usr/bin/env node
// *****************************************************************************
// Argon Design Ltd. Project P8009 Alogic
// (c) Copyright 2017 Argon Design Ltd. All rights reserved.
//
// Module : afiddle
// Author : Steve Barlow
// $Id:$
//
// DESCRIPTION:
// Main code. Run using './app.js', 'node app.js' or 'npm start'.
// *****************************************************************************

// Useful websites:
// https://github.com/ArgonDesign/alogic
// https://github.com/mattgodbolt/compiler-explorer
// https://expressjs.com/en/4x/api.html
// https://codigo.co.uk/blog/post/expressjs-and-moustache
// https://stackoverflow.com/questions/20643470/execute-a-command-line-binary-with-node-js
// http://exploringjs.com/es6/ch_promises.html
// https://stackoverflow.com/questions/40175657/stop-promise-chain-with-multiple-catches
// https://stackoverflow.com/questions/28703625/how-do-you-properly-return-multiple-values-from-a-promise
// https://stackoverflow.com/questions/34960886/are-there-still-reasons-to-use-promise-libraries-like-q-or-bluebird-now-that-we
// https://stackoverflow.com/questions/27906551/node-js-logging-use-morgan-and-winston

// External modules used
const express = require('express')
const mustacheExpress = require('mustache-express')
const bodyParser = require('body-parser')
const fs = require('fs-extra')
const childProcess = require('child_process')
const path = require('path')
const morgan = require('morgan')
const winston = require('winston')

// User adjustable options and settings
const PORT = 8000
const RUNPENDIR = path.join(__dirname, 'runpen')
const LOGDIR = path.join(__dirname, 'logs')

// -----------------------------------------------------------------------------
// Utility Functions

// Check if x is an empty object {}. Returns true if x is an empty object and false
// if it is an object containing values or if it is some other type such as null,
// undefined, a number, [] or '', whether empty or not
function isEmpty (x) {
  return x != null && x.constructor === Object && Object.keys(x).length === 0
}

// Return num padded with leading zeroes to a width of size. If num is too big
// already, just the bottom size digits are returned.
function pad (num, size) {
  return ('000000000' + num).substr(-size)
}

// Execute a shell command asynchronously using Promises. Returns a Promise which
// resolves to an object {stdout, stderr} with strings giving the result of the
// command. If there is an error, adds stdout and stderr to the error as they
// contain results from the command that failed. For instance output to stderr
// if the shell couldn't find the command or output from the command itself if
// it returned with non-zero exit status. N.B. The standard node exec function
// doesn't support Promises.
function exec (cmd) {
  return new Promise(function (resolve, reject) {
    childProcess.exec(cmd, function (error, stdout, stderr) {
      if (error) {
        // These can still have info in them even if there is an error
        error.stdout = stdout
        error.stderr = stderr
        reject(error)
      } else {
        resolve({ stdout: stdout, stderr: stderr })
      }
    })
  })
}

// Find the entity name in an alogic module. The module text is passed as a string
// in code. Returns the name or if it can't be found, returns null.
function extractEntityName (code) {
  var tokens = code
    // Concatenate continued lines
    .replace(/\\\n/g, '')
    // Remove //... comments
    .replace(/[/][/].*\n/g, ' ')
    // Remove /*...*/ comments
    .replace(/[/][*][^*]*[*][/]/g, ' ')
    // Remove preprocessor lines
    .replace(/(^|\n)\s*#[^\n]*/g, '')
    // Replace all whitespace with a single space
    .replace(/\s+/g, ' ')
    // Tokenise
    .trim().split(' ')
  // Get second token
  var name = tokens[1]
  // Check name starts with an alphabetic, _ or $ and contains only alphanumerics, _ or $
  if (name.match(/^[A-Za-z_$][A-Za-z0-9_$]*$/) != null) {
    return name
  } else {
    return null
  }
}

// -----------------------------------------------------------------------------
// Setup for logging

// We use morgan to create log messages for web requests
// We then log these and messages from elsewhere in the code using winston

fs.ensureDirSync(LOGDIR)

var logger = new winston.Logger({
  transports: [
    new winston.transports.File({
      level: 'verbose',
      filename: path.join(LOGDIR, '/all-logs.log'),
      handleExceptions: true,
      json: true,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      colorize: false
    }),
    new winston.transports.Console({
      level: 'info',
      handleExceptions: true,
      json: false,
      colorize: true
    })
  ],
  exitOnError: false
})

logger.stream = {
  write: function (message, encoding) {
    logger.info(message.trim())
  }
}

// -----------------------------------------------------------------------------
// Setup for Express

const app = express()

// Using :req[X-Forwarded-For] rather than :remote-addr so correctly logs IP addresses when used via ngrok
app.use(morgan(':req[X-Forwarded-For] :method :url :status :response-time ms', { 'stream': logger.stream }))

app.use(express.static(path.join(__dirname, 'static')))
app.use(express.static(path.join(__dirname, 'node_modules')))
app.use(express.static(path.join(__dirname, 'bower_components')))

app.engine('mustache', mustacheExpress())
app.set('view engine', 'mustache')
app.set('views', path.join(__dirname, 'views'))

app.use(bodyParser.text({ type: 'text/alogic' }))

fs.emptyDirSync(RUNPENDIR)
var runNum = 0

const ALOGIC = path.join(__dirname, 'alogic')

// Get Alogic version string
var alogicVersion
exec(ALOGIC + ' --version')
  .then(function (std) {
    alogicVersion = std.stdout
  }
)

//
// *** ENDPOINT '/' - Serve main HTML page
//
app.get('/', function (req, res) {
  res.render('index', { version: alogicVersion })
})

//
// *** ENDPOINT '/compile' - Respond to POSTs with Alogic source code by compiling it
// Input POST must have content-type 'text/alogic'. Response is 'text/plain'.
//
// If there are compilation errors, response is:
//    Compilation errors occured:
//    input.alogic:2: ERROR: mismatched input ...
//    ...
//
// If the compilation is successful and results in a single Verilog file, it is the contents of the Verilog file
//
// If it results in multiple files, they are concatenated with a ==>FILENAME<== before each file, using tail to
// do this.
//
// Test with curl http://localhost:8000/compile -H content-type:text/alogic --data-binary @test/foo.alogic
//
app.post('/compile', function (req, res) {
  var entity, dir, srcDir, destDir, srcFile
  // req.body is {} if the content-type is not recognised so the content couldn't be parsed
  if (isEmpty(req.body)) {
    res.sendStatus(415) // Unsupported media type
  } else {
    logger.log('verbose', 'request:\n' + req.body.trim())
    entity = extractEntityName(req.body) || 'unknown'
    dir = path.join(RUNPENDIR, pad(runNum, 4))
    runNum += 1
    fs.mkdir(dir)
    .then(function () {
      srcDir = path.join(dir, 'alogic')
      return fs.mkdir(srcDir)
    })
    .then(function () {
      destDir = path.join(dir, 'verilog')
      return fs.mkdir(destDir)
    })
    .then(function () {
      srcFile = path.join(srcDir, entity + '.alogic')
      return fs.writeFile(srcFile, req.body)
    })
    .then(function () {
      return exec(ALOGIC + ' -o ' + destDir + ' -y ' + srcDir + ' ' + entity)
      .then(function (std) {
        // Compile success. Results are in files in destDir
        return 'success'
      })
      .catch(function (error) {
        // alogic compiler reports errors on stderr
        var errorMessages = error.stderr
          // Tidy up path shown in error messages. Convert output like
          // /home/sjb/P8009_Alogic/afiddle/runpen/0000/alogic/input.alogic:2: ERROR: ...
          // to input.alogic:2: ERROR: ...
          .replace(/(^|\n).*[/]runpen[/]\d\d\d\d[/]alogic[/]/g, '')
        return errorMessages
      })
    })
    .then(function (result) {
      if (result === 'success') {
        // run tail to get file contents and combine all files if there is more than one
        return exec('cd ' + destDir + ' ; tail -n +1 *')
        .then(function (std) {
          return std.stdout
        })
      } else {
        return 'Compilation errors occurred:\n' + result
      }
    })
    .then(function (result) {
      logger.log('verbose', 'result:\n' + result.trim())
      res.send(result)
      fs.remove(dir)
    })
    .catch(function (error) {
      logger.log('error', error.message.trim())
    })
  }
})

//
// *** ENDPOINT '/' - Serve privacy HTML page
//
app.get('/privacy', function (req, res) {
  res.sendFile('static/privacy.html', { root: __dirname })
})

// Finally, start the server
app.listen(PORT, function () {
  logger.log('info', 'Afiddle listening on port ' + PORT + '...')
})

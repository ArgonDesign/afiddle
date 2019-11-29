#!/usr/bin/env node
// *****************************************************************************
// Argon Design Ltd. Project P8009 Alogic
// (c) Copyright 2017-8 Argon Design Ltd. All rights reserved.
//
// Module : afiddle
// Author : Steve Barlow
// $Id:$
//
// DESCRIPTION:
// Main code for afiddle web server.
//
// Run using './app.js', 'node app.js' or 'npm start'.
//
// For the first two methods, the following command line options can be used:
// --port <port>            Port to serve on (default 8000)
// --logging <choice>       Logging - local or stackdriver (default local)
//
// Options can't be specified for 'npm start' as they are interpreted as options
// to npm.
//
// Other user adjustable settings can set by editing constants below. As
// currently set up, regardless of where the server is run from, it puts its
// runpen and log files in subdirectories of the afiddle executable directory.
//
// The default logging option is 'local' which logs to the local filesystem.
// 'stackdriver' logging logs to Google Cloud's Stackdriver. This can only be
// used when running on Google Cloud or AWS. For AWS, the environment variable
// GOOGLE_APPLICATION_CREDENTIALS must be set to a json credentials file. This
// isn't required when using Google Cloud.
//
// Log information is also output to the console, provided it is a TTY. This
// is suppressed if it isn't a TTY to avoid excess output when running in a
// container.
// *****************************************************************************

// Useful websites:
// https://github.com/ArgonDesign/alogic
// https://github.com/mattgodbolt/compiler-explorer
// https://github.com/tj/commander.js
// https://expressjs.com/en/4x/api.html
// https://codigo.co.uk/blog/post/expressjs-and-moustache
// https://stackoverflow.com/questions/20643470/execute-a-command-line-binary-with-node-js
// http://exploringjs.com/es6/ch_promises.html
// https://stackoverflow.com/questions/40175657/stop-promise-chain-with-multiple-catches
// https://stackoverflow.com/questions/28703625/how-do-you-properly-return-multiple-values-from-a-promise
// https://stackoverflow.com/questions/34960886/are-there-still-reasons-to-use-promise-libraries-like-q-or-bluebird-now-that-we
// https://stackoverflow.com/questions/27906551/node-js-logging-use-morgan-and-winston
// https://cloud.google.com/logging/docs/setup/nodejs
// https://nodejs.org/api/tty.html

// External modules used
const commander = require('commander')
const express = require('express')
const mustacheExpress = require('mustache-express')
const bodyParser = require('body-parser')
const fs = require('fs-extra')
const childProcess = require('child_process')
const path = require('path')
const morgan = require('morgan')
const winston = require('winston')
const googleCloudLoggingWinston = require('@google-cloud/logging-winston')

// Command line options
commander
  .description('Web server for afiddle - a fiddle for the Alogic mid-level hardware design language')
  .option('-p, --port <port>', 'Port to serve on', 8000)
  .option('-l, --logging <choice>', 'Logging - local or stackdriver', 'local')
  .parse(process.argv)

check(isNumeric(commander.port), '--port value must be numeric')
check(contains(['local', 'stackdriver'], commander.logging), '--logging value must be local or stackdriver')

// Other user adjustable options and settings, set by editing
const RUNPENDIR = path.join(__dirname, 'runpen')
const LOGDIR = path.join(__dirname, 'logs')

// -----------------------------------------------------------------------------
// Utility Functions

// Check if value is in array. Returns true if thr array contains value, otherwise
// returns false
function contains (array, value) {
  return array.indexOf(value) !== -1
}

// Check if a value is numeric or not. Returns true if value is a number or a string
// that represents a number. Otherwise returns false
function isNumeric (value) {
  return !isNaN(value)
}

// Check condition is true and print an error message to stderr and exits the program
// with an exit code of 1 if not. Used to validate command line argument values
function check (condition, errorMessage) {
  if (!condition) {
    console.error('error: ' + errorMessage)
    process.exit(1)
  }
}

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
// in sourceCode. Returns the name or if it can't be found, returns null.
function extractEntityName (sourceCode) {
  var moduleDef = sourceCode
    // Concatenate continued lines
    .replace(/\\\n/g, '')
    // Remove /*...*/ comments
    .replace(/[/][*](.|\n)*?[*][/]/g, ' ')
    // Remove //... comments
    .replace(/[/][/].*\n/g, ' ')
    // Remove preprocessor lines
    .replace(/(^|\n)\s*#.*/g, '')
    // Remove (*...*) attributes
    .replace(/[(][*](.|\n)*?[*][)]/g, ' ')
    // Replace all whitespace with a single space
    .replace(/\s+/g, ' ')
    // Search for the module definition
    .match(/(fsm|network|verbatim entity) ([A-Za-z0-9_$]+)/)

  // Check we got a match
  if (moduleDef == null) {
    return null
  }
  var name = moduleDef[2] // Match returns complete match string and then matched groups
  return name
}

// -----------------------------------------------------------------------------
// Setup for logging

// We use morgan to create log messages for web requests
// We then log these and messages from elsewhere in the code using winston

var transports = []

// Output log messages to console only if it is a TTY
if (process.stdout.isTTY) {
  const consoleTransport = new winston.transports.Console({
    level: 'info',
    handleExceptions: true,
    json: false,
    colorize: true
  })
  transports.push(consoleTransport)
}

if (commander.logging === 'stackdriver') {
  // Logging to Google Cloud Stackdriver
  console.log('Logging to Google Cloud Stackdriver')

  const stackdriverTransport = new googleCloudLoggingWinston.LoggingWinston({
    level: 'verbose',
    logName: 'afiddle_log'
  })
  transports.push(stackdriverTransport)
} else {
  // Local logging to file
  console.log('Logging to ' + LOGDIR)

  fs.ensureDirSync(LOGDIR)

  const fileTransport = new winston.transports.File({
    level: 'verbose',
    filename: path.join(LOGDIR, '/all-logs.log'),
    handleExceptions: true,
    json: true,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
    colorize: false
  })
  transports.push(fileTransport)
}

var logger = winston.createLogger({
  transports: transports,
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
app.use(morgan(':req[X-Forwarded-For] :method :url :status :response-time ms', { stream: logger.stream }))

app.use(express.static(path.join(__dirname, 'front_end/static')))
app.use(express.static(path.join(__dirname, 'front_end/node_modules')))

app.engine('mustache', mustacheExpress())
app.set('view engine', 'mustache')
app.set('views', path.join(__dirname, 'front_end/views'))

app.use(bodyParser.text({ type: 'text/alogic' }))

fs.emptyDirSync(RUNPENDIR)
var runNum = 0

const ALOGIC = path.join(__dirname, 'alogic')

// Get Alogic version string
var alogicVersion
exec(ALOGIC + ' --version')
  .then(function (std) {
    alogicVersion = std.stdout
  })
  .catch(function (error) {
    console.error(error.message.trim())
    process.exit(1)
  })

//
// *** ENDPOINT '/' - Serve main HTML page
//
// Serves the main HTML page, which pulls in the CSS and Javascript code.
//
// The example code in the source window prior to editing can be set by adding a query string.
// '/?example=example23.alogic' will take text from the file examples/example23.alogic. If no
// query string is given, the file defaultExample.alogic is used. If the requested file doesn't
// exist, the source window is left empty.
//
app.get('/', function (req, res) {
  var exampleFileName = req.query.example || 'defaultExample.alogic'
  // Make sure someone can't hack to a higher level in the filesystem using '..'
  exampleFileName = path.basename(exampleFileName)
  var exampleText
  fs.readFile(path.join(__dirname, 'examples', exampleFileName), 'utf8')
    .then(function (result) {
      exampleText = result
    })
    .catch(function () {
      exampleText = ''
    })
    .then(function () {
      // Escape backslashes and quotes. Convert newlines to '\n's and put final text in quotes
      var txt = exampleText
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
      var quotedExampleText = '"' + txt + '"'
      res.render('index', { version: alogicVersion, exampleText: quotedExampleText })
    })
    .catch(function (error) {
      logger.log('error', error.message.trim())
      res.sendStatus(500)
    })
})

//
// *** ENDPOINT '/compile' - Respond to POSTs with Alogic source code by compiling it
//
// Input POST must have content-type 'text/alogic'. Response is 'text/plain'.
//
// If there are compilation errors, response is:
//    Compilation errors occured:
//    input.alogic:2: ERROR: mismatched input ...
//    ...
//
// If the compilation is successful and results in a single Verilog file, it is the contents of the Verilog
// file. If it results in multiple files, they are concatenated with a ==>FILENAME<== before each file,
// using tail to do this.
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
        res.sendStatus(500)
      })
  }
})

//
// *** ENDPOINT '/privacy' - Serve privacy HTML page
//
app.get('/privacy', function (req, res) {
  res.sendFile('front_end/static/privacy.html', { root: __dirname })
})

// Finally, start the server
app.listen(commander.port, function () {
  logger.log('info', 'Afiddle listening on port ' + commander.port + '...')
})

// *****************************************************************************
// Argon Design Ltd. Project P8009 Alogic
// (c) Copyright 2017 Argon Design Ltd. All rights reserved.
//
// Module : afiddle
// Author : Steve Barlow
// $Id:$
//
// DESCRIPTION:
// Client side Javascript code.
// *****************************************************************************

// Useful websites:
// http://golden-layout.com/
// https://github.com/deepstreamIO/golden-layout/issues/157
// https://github.com/Microsoft/monaco-editor
// https://stackoverflow.com/questions/38086013/get-the-value-of-monaco-editor
// https://github.com/Microsoft/monaco-editor/issues/54
// https://github.com/Microsoft/monaco-editor-samples/blob/master/browser-amd-editor/index.html

// Tell Standard about globals so it doesn't give lint errors
/* global monaco */

require.config({
  baseUrl: '.',
  paths: {
    jquery: 'jquery/dist/jquery.min',
    goldenlayout: 'golden-layout/dist/goldenlayout.min',
    vs: 'monaco-editor/min/vs'
  }
})

require(['jquery', 'goldenlayout', 'vs/editor/editor.main'], function ($, GoldenLayout, editormain) {
  var config = {
    content: [{
      type: 'row',
      content: [{
        type: 'component',
        componentName: 'alogicTextArea',
        title: 'Alogic Code'
      }, {
        type: 'component',
        componentName: 'verilogTextArea',
        title: 'Verilog Code'
      }]
    }]
  }

  var root = $('#root')
  var myLayout = new GoldenLayout(config, root)

  function sizeRoot () {
    var height = $(window).height() - root.position().top - $('.footer').outerHeight()
    root.height(height)
    myLayout.updateSize()
  }

  $(window).resize(sizeRoot)
  sizeRoot()

  monaco.languages.register({ id: 'alogic' })
  monaco.languages.register({ id: 'verilog' })
  monaco.languages.register({ id: 'verilogOrOutput' })

  require(['js/alogic_syntax'], function (alogicSyntax) {
    monaco.languages.setMonarchTokensProvider('alogic', alogicSyntax.monarchDefinition)
  })

  require(['js/verilog_syntax'], function (verilogSyntax) {
    monaco.languages.setMonarchTokensProvider('verilog', verilogSyntax.monarchDefinition)

    // Extend definition with other things that can appear in window...
    // (a) File separator
    verilogSyntax.monarchDefinition.tokenizer.root.unshift([/==>[^<]+<==/, 'constant'])
    // (b) Output is an error list, not Verilog
    verilogSyntax.monarchDefinition.tokenizer.root.unshift([/Compilation errors occurred:/, {token: 'invalid', next: '@errors'}])
    verilogSyntax.monarchDefinition.tokenizer.errors = [[/./, 'invalid']]
    // (c) There is no output yet, just the initial message
    verilogSyntax.monarchDefinition.tokenizer.root.unshift([/Verilog code output here\.\.\./, 'attribute'])

    monaco.languages.setMonarchTokensProvider('verilogOrOutput', verilogSyntax.monarchDefinition)
  })

  myLayout.registerComponent('alogicTextArea', function (container, state) {
    window.alogicEditor = monaco.editor.create(container.getElement()[0], {
      value: [
        'fsm add {',
        '  in sync ready u8 p_in;',
        '  in u8 addend;',
        '',
        '  out sync ready u8 p_out;',
        '',
        '  void main() {',
        '    u8 sum = p_in.read() + addend;',
        '    p_out.write(sum);',
        '    fence;',
        '  }',
        '}'
      ].join('\n'),
      language: 'alogic',
      automaticLayout: true,
      wordWrap: true
    })
  })

  myLayout.registerComponent('verilogTextArea', function (container, state) {
    window.verilogViewer = monaco.editor.create(container.getElement()[0], {
      value: [
        'Verilog code output here...'
      ].join('\n'),
      language: 'verilogOrOutput',
      automaticLayout: true,
      wordWrap: true,
      readOnly: true
    })
  })

  $('#compileButton').click(function () {
    $('#compileButton').prop('disabled', true)
    $('#compileStatus').html('Compiling...')
    $.ajax({
      type: 'POST',
      url: 'compile',
      data: window.alogicEditor.getValue(),
      datatype: 'text/*',
      contentType: 'text/alogic',
      success: function (data) {
        // console.log(data) !!!
        window.verilogViewer.setValue(data)
        $('#compileStatus').html('')
        $('#compileButton').prop('disabled', false)
      },
      error: function (error) {
        console.log(error)
        $('#compileStatus').html('')
        $('#compileButton').prop('disabled', false)
      }
    })
  })

  myLayout.init()
})

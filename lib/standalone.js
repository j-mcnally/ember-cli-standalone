'use strict';

var path = require('path');
var fs   = require('fs');
var replace     = require('broccoli-replace');
var pickFiles   = require('broccoli-static-compiler');
var mergeTrees = require('broccoli-merge-trees');
var stringUtil = require('ember-cli/lib/utilities/string')


function EmberCLIStandalone(project) {
  this.project = project;
  this.name    = 'Ember CLI Standalone';
}

function unwatchedTree(dir) {
  return {
    read:    function() { return dir; },
    cleanup: function() { }
  };
}

function injectENVJson(name, fn, env, tree, files) {
  // TODO: real templating
  var self = this;
  var envJsonString = function(){
    var my_env = fn(env);
    return JSON.stringify(my_env);
  };
  var namespaceString = function() {
      return stringUtil.classify(name);
  };
  var nameString = function() {
    return name;
  }

  var baseTag = function(){
    var envJSON      = fn(env);
    var baseURL      = cleanBaseURL(envJSON.baseURL);
    var locationType = envJSON.locationType;

    if (locationType === 'hash' || locationType === 'none') {
      return '';
    }

    if (baseURL) {
      return '<base href="' + baseURL + '" />';
    } else {
      return '';
    }
  };

  return replace(tree, {
    files: files,
    patterns: [{
      match: /\{\{ENV\}\}/g,
      replacement: envJsonString
    },
    {
      match: /\{\{APPNAME\}\}/g,
      replacement: nameString
    },
    {
      match: /\{\{NAMESPACE\}\}/g,
      replacement: namespaceString
    },
    {
      match: /\{\{BASE_TAG\}\}/g,
      replacement: baseTag
    }]
  });
}

function injectManifest(app, tree, files) {
  // TODO: real templating
  var self = this;

  var nameString = function() {
      return app.name;
  };

  var descString = function() {
      return app.project.pkg.description;
  };

  var versionString = function() {
      return app.project.pkg.version;
  };


  return replace(tree, {
    files: files,
    patterns: [
    {
      match: /\{\{APPNAME\}\}/g,
      replacement: nameString
    },
    {
      match: /\{\{APPDESC\}\}/g,
      replacement: descString
    },
    {
      match: /\{\{APPVERSION\}\}/g,
      replacement: versionString
    }]
  });
}

EmberCLIStandalone.prototype.treeFor = function treeFor(name) {
}

EmberCLIStandalone.prototype.included = function included(app) {


  var treePath =  path.join('node_modules', 'ember-cli-standalone', 'environment');
  if (fs.existsSync(app.project.root + "/public/env.js")) {
    treePath = app.project.root + "/public"
  }

  var config = require(app.project.root + "/config/environment.js")
  if (fs.existsSync(treePath)) {
    var files = ['env.js'];

    var env = pickFiles(unwatchedTree(treePath),{
      srcDir: '/',
      files: files,
      destDir: '/'
    });
    var envTree = injectENVJson(app.name, config, app.env, env, files);
    app.oldPublic = app.publicTree
    app.publicTree = function() {
      var publicTree = app.oldPublic();
      return mergeTrees([publicTree, envTree], { overwrite: true })
    };

  }

}


module.exports = EmberCLIStandalone;
/*
 * im.js
 * Root namespace module
*/

/* jshint unused: false */ 
/* globals im: true*/
var im = (function () {
  'use strict';

  var initModule = function ($container) {
    im.model.initModule();
    im.shell.initModule($container);
  };

  return {
    initModule: initModule
  };
}());
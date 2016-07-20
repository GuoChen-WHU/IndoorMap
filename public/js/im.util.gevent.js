/*
 * im.util.gevent.js
 * Global event module, realize global events so that modules can
 * conmunication with each other.
 * The codes are copied from the book 《JavaScript设计模式与开发实践》
*/

im.util.gevent = (function () {

  var 
    Event,
    _default = 'default';

  Event = function () { // 为啥还套一层？
    var _listen,
        _trigger,
        _remove,
        _shift = Array.prototype.shift,
        _unshift = Array.prototype.unshift,
        namespaceCache = {},
        _create,
        each = function ( ary, fn ) {// 跟数组自带的each相比多一个返回值，只返回最后一个函数的返回值？
          var ret;
          for ( var i = 0, l = ary.length; i < l; i++ ) {
            var n = ary[i];
            ret = fn.call( n, i, n );
          }
          return ret;
        };

    _listen = function ( key, fn, cache ) {
      if ( !cache[ key ] ) {
        cache[ key ] = [];
      }
      cache[ key ].push( fn );
    };

    _remove = function ( key, cache, fn ) {
      if ( cache[ key ] ) {
        if ( fn ) {
          for ( var i = cache[ key ].length; i >= 0; i-- ) {
            if ( cache[ key ][i] === fn ) {
              cache[ key ].splice( i, 1 );
            }
          }
        } else {
          cache[ key ] = [];
        }
      }
    };

    _trigger = function () { // arguments是cache, 事件名, 数据
      var cache = _shift.call( arguments ),
          key = _shift.call( arguments ),
          args = arguments, // 这里剩下数据
          _self = this, // 这个this值是im.util.gevent
          stack = cache[ key ];

      if ( !stack || !stack.length ) {
        return;
      }

      return each( stack, function () {
        return this.apply( _self, args ); // 这个this值是stack中的每一个函数，为啥传进来的索引(i)和函数本身(n)这里都没有用到？
      });
    };

    _create = function ( arg_namespace ) {
      var namespace = arg_namespace || _default,
          cache = {},
          offlineStack = [],
          lastOffline,
          ret = {
            listen: function ( key, fn, last ) {
              _listen( key, fn, cache );
              if ( offlineStack === null ) {
                return;
              }
              if ( last === 'last' ) { // last是可选项， 如果传入'last'的话只触发最后一个
                if ( offlineStack.length > 0 ) {
                  lastOffline = offlineStack.pop();
                  lastOffline();
                }
              } else {
                each( offlineStack, function () {
                  this(); // 这里也没有用到传进来的索引和函数本身啊= =
                });
              }

              offlineStack = null;
            },
            one: function ( key, fn, last ) {
              _remove( key, cache );
              this.listen( key, fn, last );
            },
            remove: function ( key, fn ) {
              _remove( key, cache, fn );
            },
            trigger: function () {
              var fn,
                  args,
                  _self = this; // 是im.util.gevent

              _unshift.call( arguments, cache );
              args = arguments; // 现在是cache, 事件名, 数据
              fn = function () {
                return _trigger.apply( _self, args ); // 把cache, 事件名, 数据传进去
              };

              if ( offlineStack ) {
                return offlineStack.push( fn ); // 返回离线事件的数量
              }
              return fn(); // 返回对应事件的最后一个监听函数的返回值，这俩返回值其实都没有用到= =
            }
          };

      return namespace ? // namespace始终不会为空啊= =
          ( namespaceCache[ namespace ] ? namespaceCache[ namespace ] :
                namespaceCache[ namespace ] = ret )
                    : ret;
    };

    return {
      create: _create,
      one: function ( key, fn, last ) {
        var event = this.create();
        event.one( key, fn, last );
      },
      remove: function ( key, fn ) {
        var event = this.create();
        event.remove( key, fn );
      },
      listen: function ( key, fn, last ) {
        var event = this.create();
        event.listen( key, fn, last );
      },
      trigger: function () {
        var event = this.create();
        event.trigger.apply( this, arguments ); // arguments是事件名字和数据
      }
    };
  }();

  return Event;

}());
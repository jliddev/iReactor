window.ireactor = window.ir = (function(){
    var ANY_DOMAIN = '*';

    var MSG_SET_NAME =  0x0001;
    var MSG_BROADCAST = 0x0002;
    var MSG_TELL =      0x0004;

    var REACTOR_ID = createId();
    var IS_TOP = window.top === this;

    var metric_packets = {};
    var metric_times = [];

    var isNameSet = false;
    var reactors = {};
    var listeners = {};

    document.addEventListener('DOMContentLoaded', function(){
      if( isNameSet == false ){
        setName(REACTOR_ID);
      }
    },false);

    window.addEventListener('message', function(event){
      if( event.data.m === MSG_SET_NAME ){
        handleSetName(event);
        console.log( document.querySelectorAll('[irname="'+event.data.v+'"]') );
      } else if( event.data.m === MSG_BROADCAST ){
        this.emit(event.data.e, event.data.v);
        sendToAll( event.data.e, event.data.v );
      } else if( event.data.m === MSG_TELL ){
        if( event.data.i.indexOf(REACTOR_ID) !== -1 ){
          this.emit( event.data.e, event.data.v);
        }
        forward( event.data );
      }
    }, false);

    this.setName = function setName(name){
      isNameSet = true;
      REACTOR_ID = name;
      postParent(MSG_SET_NAME, name);
    }

    this.tell = function tell( recipients, evt, value ){
      if( !IS_TOP ){
        var pkt = {
          m: MSG_TELL,
          i: Array.isArray(recipients) ? recipients : [recipients],
          e: evt,
          v: value
        };
        postTarget( window.top, pkt );
      }
    }

    this.broadcast = function broadcast( evt, value ){
      if( IS_TOP ){
        this.emit(evt, value);
        sendToAll(evt, value);
      } else {
        var pkt = {
          m: MSG_BROADCAST,
          e: evt,
          v: value
        };
        postTarget( window.top, pkt );
      }
    }

    this.on = function on( evt, handler ){
      if( isNullOrUnd(evt) || typeof handler !== 'function' )
        throw new TypeError('event cannot be null or undefined, handler must be a function');

      if( listeners[evt] ){
        listeners[evt].push( handler );
      } else {
        listeners[evt] = [handler];
      }
    }

    this.emit = function emit( evt, data ){
      if( isNullOrUnd(evt) )
        throw new TypeError("event cannot be null or undefined");

      if( !isNullOrUnd(listeners[evt]) ){
        listeners[evt].forEach(function(handler){
          try{
            handler.apply(this, [data]);
          } catch( e ){
            console.error(e);
          }
        });
      }
    }

    function getAllIRFrames() {
      var iframes = document.querySelectorAll('[irname]');
      return iframes;
    }

    function forward( eventData ){
      var iframes = getAllIRFrames();
      iframes.forEach(function(frame){
        postTarget( frame.contentWindow, eventData );
      });
    }

    function sendToAll( evt, value ){
      var iframes = getAllIRFrames();
      var pkt = { m: MSG_BROADCAST, e: evt, v: value };
      iframes.forEach(function(frame){
        postTarget( frame.contentWindow, pkt );
      })
    }

    function postParent( msg, value ){
      if(!IS_TOP){
        postTarget( window.parent, {m: msg, v: value} );
      }
    }

    function postTarget( target, packet){
      if( !isNullOrUnd(target) && isFunction( target.postMessage ) ){
        packet._pid = createId();
        target.postMessage(packet, ANY_DOMAIN);
      }
    }

    function handleSetName( event ){
      var iframes = Array.prototype.slice.call(document.getElementsByTagName('IFRAME'));
      iframes.forEach(function(frame){
        if( frame.contentWindow === event.source ) {
          frame.setAttribute('irname', event.data.v);
        }
      });
    }

    //HELPERS
    function createId() {
      return Math.floor(Math.random() * 1000000000);
    }

    function isFunction( obj ){
      return typeof obj === 'function';
    }

    function isNullOrUnd( obj ){
      return obj === null || obj === undefined;
    }

    return this;
})();

// import createXHR from './xhr'

function createXHR() {
  if (typeof XMLHttpRequest !== 'undefined') {
    return new XMLHttpRequest()
  } else if (typeof ActiveXObject !== 'undefined') {
    if (typeof arguments.callee.activeXString !== 'undefined') {
      var versions = ['MSXML2.XMLHttp.6.0', 'MSXML2.XMLHttp.3.0', 'MSXML2.XMLHttp']
      var i, len
      for (i = 0, len = versions.length; i < len; i++) {
        try {
          new ActiveXObject(versions[i])
          arguments.callee.activeXString = versions[i]
          break
        } catch (error) {

        }
      }
    }
    return new ActiveXObject(arguments.callee.activeXString)
  } else {
    throw new Error('No XHR Object available.')
  }
}

function ajax(options) {
  var methods = ['get', 'post', 'put', 'delete']
  var options = options || {}
  options.baseUrl = options.baseUrl || ''
  if (options.method && options.url) {
    return xhrConnection(
      options.method,
      options.baseUrl + options.url,
      maybeData(options.data),
      options
    )
  }
  return methods.reduce(function (acc, method) {
    acc[method] = function (url, data) {
      return xhrConnection(
        method,
        options.baseUrl + url,
        maybeData(data),
        options
      )
    }
    return acc
  }, {})
}

function maybeData(data) {
  return data || null
}

function xhrConnection(type, url, data, options) {
  var returnMethods = ['then', 'catch', 'always']
  var promiseMethods = returnMethods.reduce(function (promise, method) {
    promise[method] = function (callback) {
      promise[method] = callback
      return promise
    }
    return promise
  }, {})
  var xhr = new createXHR()
  var featuredUrl = getUrlWithData(url, data, type)
  xhr.open(type, featuredUrl, true)
  xhr.withCredentials = options.hasOwnProperty('withCredentials')
  setHeaders(xhr, options.headers)
  xhr.addEventListener('readystatechange', ready(promiseMethods, xhr), false)
  xhr.send(objectToQueryString(data))
  promiseMethods.abort = function () {
    return xhr.abort()
  }
  return promiseMethods
}

function getUrlWithData(url, data, type) {
  if (type.toLowerCase() !== 'get' || !data) {
    return url
  }
  var dataAsQueryString = objectToQueryString(data)
  var queryStringSeparator = url.indexOf('?') > -1 ? '&' : '?'
  return url + queryStringSeparator + dataAsQueryString
}

function setHeaders(xhr, headers) {
  headers = headers || {}
  if (!hasContentType(headers)) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded'
  }
  Object.keys(headers).forEach(function (name) {
    (headers[name] && xhr.setRequestHeader(name, headers[name]))
  })
}

function hasContentType(headers) {
  return Object.keys(headers).some(function (name) {
    return name.toLowerCase() === 'content-type'
  })
}

function ready(promiseMethods, xhr) {
  return function handleReady() {
    if (xhr.readyState === xhr.DONE) {
      xhr.removeEventListener('readystatechange', handleReady, false)
      promiseMethods.always.apply(promiseMethods, parseResponse(xhr))

      if (xhr.status >= 200 && xhr.status < 300) {
        promiseMethods.then.apply(promiseMethods, parseResponse(xhr))
      } else {
        promiseMethods.catch.apply(promiseMethods, parseResponse(xhr))
      }
    }
  }
}

function parseResponse(xhr) {
  var result
  try {
    result = JSON.parse(xhr.responseText)
  } catch (e) {
    result = xhr.responseText
  }
  return [result, xhr]
}

function objectToQueryString(data) {
  return isObject(data) ? getQueryString(data) : data
}

function isObject(data) {
  return Object.prototype.toString.call(data) === '[object Object]'
}

function getQueryString(object) {
  return Object.keys(object).reduce(function (acc, item) {
    var prefix = !acc ? '' : acc + '&'
    return prefix + encode(item) + '=' + encode(object[item])
  }, '')
}

function encode(value) {
  return encodeURIComponent(value)
}

(function (window, factory) {
    if (typeof exports === 'object') {
        module.exports = factory()
    } else if (typeof define === 'function' && define.amd) {
        define(factory)
    } else {
        window.CascadeSelect = factory()
    }
}(this, function () {
    'use strict'
    
    function mixin(obj, src) {
        for (var key in src) {
            if (src.hasOwnProperty(key)) {
                obj[key] = src[key]
            }
        }
        return obj
    }

    function ajax(url, callback, timeout) {
        var xhr = new XMLHttpRequest()

        xhr.open('GET', url, true)

        xhr.onreadystatechange = function () {
            if (this.readyState === 4) {
                if ((this.status >= 200 && this.status < 300) || this.status == 304) {
                    try {
                        var data = JSON.parse(this.responseText)
                        callback && callback(data)
                    } catch (e) {
                        console.error(e.message)
                    }
                } else {
                    console.error(xhr.statusText)
                }
            }
        }

        if (timeout) {
            xhr.timeout = timeout || 1000
            xhr.ontimeout = function () {
                console.error('request timeout')
            }
        }

        xhr.send()
    }

    /*
     * CascadeSelect 层级下拉框
     * @param {Array} selects  下拉框dom对象数组,按层级排序
     * @param {Object} options 参数
     */
    function CascadeSelect(selects, options) {

        var defaults = {
            //客户端数据
            data: [],
            //ajax请求路径，优先级比data高
            url: '',

            //默认选中值
            selectedValues: [],

            //根节点
            rootParentID: '0',
            //父节点字段名称
            parentField: 'ParentID',
            //文本字段名称
            textField: 'Text',
            //值字段名称
            valueField: 'Value',

            //默认项 false表示不使用
            defaultOption: { value: '0', text: '---请选择---' },
            //是否隐藏空下拉框
            emptySelectHidden: false,
            //是否禁用空下拉框
            emptySelectDisabled: true,

            //选择回调事件
            onSelected: function (select, CascadeSelect) { }
        }

        if (!(this instanceof CascadeSelect)) {
            return new CascadeSelect(selects, options)
        }

        this.selects = Array.prototype.slice.call(selects)
        this.options = mixin(defaults, options)

        this._init()
    }

    CascadeSelect.prototype = {
        constructor: CascadeSelect,
        //初始化
        _init: function () {
            this._bindEvent()
            this.setValue(this.options.selectedValues)
        },
        //绑定下拉框事件
        _bindEvent: function () {

            var onChange = function (index) {
                var select = this.selects[index],
                    next

                //绑定下级    
                if (select) {
                    if (next = this.selects[index + 1]) {
                        //初始化子级
                        this._bindSelect(select.value, function (data) {
                            this._render(next, data)
                            //重新绑定子级
                            onChange(index + 1)
                        }.bind(this))
                    }

                    //执行绑定的回调事件
                    this.options.onSelected(select, this)
                }
            }.bind(this)

            this.selects.forEach(function (select, index, selects) {
                select.addEventListener('change', function () {
                    onChange(index)
                })
            })
        },
        /**
         *  设置下拉框的值
         *  @param {Array}   values         值集合
         *  @param {Boolean} needCallback   是否执行回调事件
         */
        setValue: function (values, needCallback) {
            var index = arguments[2] || 0,
                parentid = arguments[3] || this.options.rootParentID,
                select = this.selects[index]

            if (select) {
                //绑定节点
                this._bindSelect(parentid, function (data) {
                    this._render(select, data)

                    var value = values[index]
                    //设置下拉框值
                    select.value = value

                    //递归设置下级
                    this.setValue(values, needCallback, ++index, value)

                    //默认不触发回调事件
                    if (needCallback) {
                        this.options.onSelected(select, this)
                    }
                }.bind(this))
            }
        },
        /**
         * 获取下拉框的值
         */
        getValues: function () {
            return this.selects.map(function (select) {
                return select.value
            })
        },
        /**
         * 获取下拉框的描述
         * @param  {String} separator 分隔符
         * @param  {String} emptyValue 要排除的空值
         */
        getDescripts: function (separator, emptyValue) {
            separator = separator || ''
            emptyValue = emptyValue === undefined ? '0' : emptyValue + ''

            var arr = []

            this.selects.forEach(function (select) {
                var option = select.options[select.selectedIndex]

                //判断是否为空值
                if (option && option.value !== emptyValue) {
                    arr.push(option.text)
                }
            })

            return arr.join(separator)
        },
        _cache: {},
        /**
         * 获取数据并绑定
         * @param  {String} parentid 父节点值
         * @param  {Function} render 绑定方法
         */
        _bindSelect: function (parentid, callback) {
            if (parentid === undefined) {
                return
            }

            var data = this._cache[parentid],
                _render = function (data) {
                    //过滤数据
                    var parentField = this.options.parentField,
                        result = data.filter(function (item) {
                            return item[parentField] + '' === parentid + ''
                        })

                    callback && callback(result)

                    //加入处理
                    this._cache[parentid] = data
                }.bind(this)


            if (data === undefined) {
                //获取远程数据
                if (this.options.url) {
                    this._getRemoteData(parentid, _render)
                } else {//使用本地数据
                    _render(this.options.data)
                }
            } else {
                //使用缓存数据
                _render(data)
            }
        },
        //获取服务端数据
        _getRemoteData: function (parentid, callback) {
            var url = this.options.url

            //组装url
            url += url.endsWith('?') ? '&' : '?' + this.options.parentField + '=' + parentid

            ajax(url, callback, 1000)
        },
        /**
         * 渲染
         * @param  {Element} select 下拉框
         * @param  {Array}   data   绑定的数据
         */
        _render: function (select, data) {
            var value,
                text,
                options = this.options,
                hasValue = data && data.length

            //清空
            select.options.length = 0

            //添加选项
            if (hasValue) {
                data.forEach(function (item) {
                    value = item[options.valueField]
                    text = item[options.textField]

                    select.add(new Option(text, value))
                })
            }

            //添加默认选项
            if (options.defaultOption) {
                value = options.defaultOption.value
                text = options.defaultOption.text

                select.add(new Option(text, value))
                select.value = value
            }

            //隐藏或者禁用空项
            if (options.emptySelectHidden) {
                select.style.display = hasValue ? '' : 'none'
            }

            if (options.emptySelectDisabled) {
                select.disabled = !hasValue
            }
        }
    }

    return CascadeSelect
}))
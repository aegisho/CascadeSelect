//ie9+
(function (factory) {
    if (typeof define === 'function' && define.amd) {
        define(factory)
    } else {
        window.CascadeSelect = factory()
    }
}(function () {
    'use strict'

    function mixin(obj, src) {
        for (var key in src) {
            if (src.hasOwnProperty(key)) {
                obj[key] = src[key]
            }
        }
        return obj
    }

    /**
     * CascadeSelect 层级下拉框
     * @param {Array} selects  下拉框dom对象数组,请按层级排序
     * @param {Object} options 参数
     */
    function CascadeSelect(selects, options) {
        var defaults = {
            //客户端数据
            data: [],
            //ajax请求路径
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

            //选择回调方法
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
        _init: function () {
            if (typeof this.options.onSelected !== 'function') {
                this.options.onSelected = function () { }
            }

            if (!(this.options.selectedValues instanceof Array)) {
                this.options.selectedValues = []
            }

            if (this.options.url) {
                this.options.url += this.options.url.endsWith('?') ? '&' : '?' + this.options.parentField + '='
            }

            this._bindEvent()
            this._initRoot()

            //设置初始值
            this.setValue(this.options.selectedValues, true)
        },
        //初始化根选项
        _initRoot: function () {
            var select = this.selects[0],
                parentid = this.options.rootParentID

            if (select) {
                this._render(select, this._getData(parentid))
            }
        },
        _onChange: function (index, nonCallback) {
            var select = this.selects[index],
                next

            //绑定下级    
            if (select) {
                if (next = this.selects[index + 1]) {
                    //初始化下级
                    this._render(next, this._getData(select.value))
                    this._onChange(index + 1, true)
                }

                if (!nonCallback) {
                    this.options.onSelected(select, this)
                }
            }
        },
        _bindEvent: function () {
            var _this = this,
                len = this.selects.length

            this.selects.forEach(function (select, index, selects) {
                select.addEventListener('change', function () {
                    _this._onChange(index)
                })
            })
        },
        /**/
        setValue: function (selectedValues, nonCallback) {
            this.selects.forEach(function (select, index) {
                select.value = selectedValues[index] || ''
                this._onChange(index, nonCallback)
            }, this)
        },
        /**
         * 获取下拉框的描述
         * @param  {String} separator 分隔符
         * @param  {String} emptyValue 要排除的空值
         */
        getDescript: function (separator, emptyValue) {
            separator = separator || ''
            emptyValue = emptyValue === undefined ? '0' : emptyValue + ''

            var arr = []

            this.selects.forEach(function (select) {
                var option = select.options[select.selectedIndex]

                if (option && option.value !== emptyValue) {
                    arr.push(option.text)
                }
            })

            return arr.join(separator)
        },
        _cache: {},
        //获取数据
        _getData: function (parentid) {
            if (parentid === undefined) {
                return []
            }

            var result = this._cache[parentid],
                parentField

            //缓存处理
            if (result === undefined) {
                result = this.options.url ? this._getRemoteData(parentid) : this.options.data

                //过滤数据
                parentField = this.options.parentField
                result = result.filter(function (item) {
                    return item[parentField] + '' === parentid + ''
                })

                this._cache[parentid] = result
            }

            return result
        },
        //获取服务端数据
        _getRemoteData: function (parentid) {
            var url = this.options.url + parentid,
                result,
                xhr = new XMLHttpRequest()

            xhr.open('GET', url, false)

            xhr.onreadystatechange = function myfunction() {
                if (this.readyState === 4 &&
                    (this.status >= 200 || this.status < 300 || this.status == 304)) {
                    result = JSON.parse(this.responseText)
                } else {
                    console.error(xhr.statusText)
                }
            }

            xhr.timeout = 1000
            xhr.ontimeout = function () {
                console.error('request timeout')
            }

            xhr.send()

            return result
        },
        _render: function (select, data) {
            var value,
                text,
                options = this.options,
                hasValue = data && data.length

            select.options.length = 0

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
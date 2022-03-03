/** events storage object {@link DomHelper.events} */
const domEventsStore = {};

/**
 * DomHelper Object template model
 * @typedef {Object} DHTemplate
 * @property {String} type - DOM element type
 * @property {String} [ref] - reference for dom element (!)
 * @property {String} [text] - message.properties path for Node.contentText
 * @property {Object} [style] - CSS properties
 * @property {*} [_nodeAttribute] - DOM node attributes
 * @property {DHTemplate[]} [children] - children templates
 * @property {Object} [events] - DOM Node events and functions
 *
 * ! - required for events and updating methods
 *
 * @example
 *  template = {
 *      type: "div",
 *      ref: "div_ref",
 *      text: "message.properties.DO.NOT.CLICK.THIS.BUTTON !",
 *      children:[{
 *          type: "button",
 *          ref: "button_ref",
 *          text: "message.properties.click.me",
 *          style: {"background-color": "red"},
 *          _id: "button_id",
 *          _class: "classForCss",
 *          _disabled: true,
 *          events:{
 *              click: (e)=> console.log("CLICKED °O°", e)
 *          }
 *      }],
 *      events:{
 *          // the load event is triggered at element Dom insertion with the element as param
 *          load: (div)=> div.querySelector('button').setAttribute("disabled", false)
 *      }
 *   }
 */

/**
 * Class for DOM manipulation by an [Object template model]{@link DHTemplate}:
 *  - [create]{@link DomHelper._elements}
 *  - [insert to body]{@link DomHelper.init}
 *  - [insert by ref]{@link DomHelper.insertTo}
 *  - [find]{@link DomHelper.getNode}
 *  - [update]{@link DomHelper.update}
 *
 * @description
 * The elements {@link DHTemplate template} are made to build a DOM node and its children by cascade.
 *
 * @example
 * new DomHelper().init(templateModel);
 */
class DomHelper{

    /**
     * Getter - events storage
     * @type {Object}
     * @private
     */
    static get events(){
		return domEventsStore;
	}
	
	/**
	 * Get dom element by ref data attribute
     * @param {String} ref - ref string of template element
     * @returns {HTMLElement|HTMLAllCollection}
	 */
    getNode(ref){
		const type = (ref) ? '[data-ref="'+ ref +'"]' : '[data-ref]';
		const elements = document.querySelectorAll(type);
		return (elements.length > 1) ? elements : elements[0];
	}
	
	/**
	 * Init dom elemets appending template to the document.body
     * @param {DHTemplate} template - element template
	 */
    init(template){
		const element = this._elements(template);
		document.body.append(element);
		this._setEventListeners();
	}

    /**
     * Insert dom in target element by ref
     * @param {String} refTarget - the target ref attribute where the element should be insert
     * @param {DHTemplate} template - the template model of the element to insert
     * @returns {HTMLElement} the element insert
     */
    insertTo(refTarget, template){
            const element = this._elements(template);
            const target = this.getNode(refTarget);
            if(!target){
                console.error("Could not insert element: Element with ref <<", refTarget, ">> do not exist", template);
                return element;
            }
            target.append(element);
            this._setEventListeners();
            return element;
    }

	/**
	 * Creates DOM element and children by template
	 * @param {DHTemplate} template - template model
     * @returns {HTMLElement|null} element built
     * @private
	 */
	_elements(template){
		//console.log("_elements", template);
		// block if no type especified
		if(!template || !template.type){return null}

		// get config values and delete from obj (keep only attributes)

		// type of element
		const type = template.type;
		delete template.type;
		// reference for dom storage
		const ref = template.ref;
		delete template.ref;
		// text for element
		const text = template.text;
		delete template.text;
        // style for element
        const style = template.style;
        delete template.style;
		// children of element
		const children = template.children;
		delete template.children;
		// build element
		const el = this.element(type, template, text, style);

		// if has ref
		if(ref){
			// add data-ref attribute to element
			el.setAttribute("data-ref", ref);

			if(template.events){
				// events for element
				const events = template.events;
				delete template.events;
				this.constructor.events[ref] = events;
			}

		}else if(template.events){
		    console.warn(`Could not set event for template: missing REF!`, [template]);
		}

		// if has children, build and append each
		(children) && children.forEach((child)=>{
			// enable to have DOM elements as child
			const elChild = (this.constructor._isDom(child)) ? child : this._elements(child);
			el.appendChild(elChild);
		});

		return el
	}

    /**
     * Updates a dom element with a template
     * @param oldEl {HTMLElement} of element to be updated
     * @param newTemplate {DHTemplate} element template model
     * @private
     */
    _updateElement(oldEl, newTemplate){
        if(!oldEl || !newTemplate){return}
        const newEl = this._elements(newTemplate);
        oldEl.replaceWith(newEl);
        this._setEventListeners();
    }


    /**
     * Updates a template by the ref data value
     * @param {DHTemplate} template - template model
     */
    update(template){
        if(!template){return}
        this._updateElement(this.getNode(template.ref), template);
    }


	/**
	 * Creates DOM element and its set attributes
     * @param type {String} type of node of element
     * @param attributes {Object} object with node attributes for element (model: {_[node_attribute] : value })
     * @param text {String} textContent for element
     * @param style {Object} object with css properties for element (model: {cssPropertie : cssPropertieValue})
     * @returns {HTMLElement} DOM Node element
	 */
	 element(type, attributes, text = "", style){
		const el = document.createElement(type);
		// set node helpers
		this._node_setHelpers(el);
		this._setAttributes(el, attributes, text, style);
		return el;
	}

    /**
     * Set Node attributes
     * @param el {HTMLElement} the element to set attributes
     * @param attributes {Object} dom node attributes to be set
     * @param text {String}  message.properties path for the node textContent
     * @param style {Object} object with css properties for element
     * @returns {HTMLElement} DOM Node element
     * @private
     */
    _setAttributes(el, attributes, text, style){
		el.textContent = d2e.trad(String(text));

		if(style){ // if Object style is defined, set it as inline style
		    el.setAttribute("style", Object.entries((style)).map((s)=>s.join(":")).join(";"));
        }

		Object.entries(attributes).forEach((entrie)=>{
		    /** @type String */
			const attr = entrie[0];
            /** @type String */
			const value = entrie[1];
			if(attr.charAt(0) === "_" && value){
				el.setAttribute(attr.slice(1), value);
			}
		});
		return el;
	}

	/**
	 * Check if is a DOM element
     * @param element {HTMLElement} element for checking
     * @returns {Boolean}
     * @private
	 */
    static _isDom(element){
		return (element && element instanceof HTMLElement);
	}

	/**
	 * Sets all event listeners from [events storage]{@link domEventsStore} and execute load events
     * @private
	 */
    _setEventListeners(){
		Object.keys(this.constructor.events).forEach((ref)=>{
			const el = this.getNode(ref);
			const evts = this.constructor.events[ref];
            (evts) && Object.keys(evts).forEach((type)=>{
				if(type === "load"){
					evts[type](el);
				}else{
					const fn = evts[type];
					//console.log(ref, type, fn, el);
					(fn) && el.removeEventListener(type, fn);
					(fn) && el.addEventListener(type, fn);
				}

			});
			// remove from list
			delete this.constructor.events[ref];
		});
	}

	/**
	 * _ Node helpers
	 */

	/**
	 * Setter for dom node manipulation helpers
	 *
	 * to set a new helper:
	 *
	 * 1. Add method naming "node_nameOfFunction"
	 * 2. Add "nameOfFunction" to this list of helpers
	 * (* the method scope is a {@link HTMLElement})
     * @private
	 */
	_node_setHelpers(el){
		[
			"setStyle",
			"removeStyle",
			"removeClass",
            "toggleClass",
			"addClass",
			"hasClass",
			"hide"
		].forEach((fName)=>{
		    /** @type function */
		    const method = this.constructor["_node_" + fName];
			el[fName] = method.bind(el);
		})
	}


    /**
     * hide element with css (display: nonne)
     * @this HTMLElement
     * @private
     */
	static _node_hide() {
		this.setStyle("display:none");
	};

	/**
	 * Add element style
	 * @param {String|Object} style - styles for element
     * @example
     * "display:none;aligne:left;" or {"display": "none", "align": "left"}
     * @this HTMLElement
     * @private
	 */
    static _node_setStyle(style) {
        const styles = this.getAttribute("style") || "";
        const current = styles.split(";");
        const curProps = current.map((s)=>s.split(":")[0]);

        style = (typeof style == "object") ? style : style.split(";").reduce((acc, stl)=>{
            const entrie = stl.split(":");
            const prop = entrie[0];
            const value = entrie[1];
            if(prop && value){ acc[prop] = value; }
            return acc;
        }, {});

        const final = Object.entries(style).reduce((acc, entrie)=>{
            const prop = entrie[0];
            const value = entrie[1];
            // if style already exist, remove it
            if(curProps.includes(prop)){
                const i = curProps.indexOf(prop);
                current.splice(i, 1);
                curProps.splice(i, 1);
            }
            // add style with value
            current.push([prop, ":", value].join(""));
            return current.filter((s)=>(Boolean(s) && s !== ";")).join(";");
        }, styles);

        this.setAttribute("style", final);
        return this;
    };

	/**
	 * Remove element style
	 * @param {String} type - style prop type
     * @this HTMLElement
     * @private
	 */
	static _node_removeStyle(type) {
		// get styles set
		const styles = this.getAttribute("style") || "";
		// split styles
		const current = styles.split(";");
		// filter style of same type as parameter
		const final = current.filter((style)=> (style.split(":")[0] !== type));
		// set element style
		this.setAttribute("style", final.join(";"));
		return this;
	};

	/**
	 * Remove element class
	 * @param {String} cName - class name to be removed
     * @this HTMLElement
     * @private
	 */
	static _node_removeClass(cName) {
		this.classList.remove(cName);
		return this;
	};

	/**
	 * Remove element class (single or multiple)
	 * @param {String} cNames - class names to be added separate by 1 white space (ex: "class1 class2")
     * @this HTMLElement
     * @private
	 */
	static _node_addClass(cNames) {
		this.classList.add(...cNames.split(" "));
		return this;
	};

    /**
     * Toggle element class
     * @param {String} cName - class name to be toggled
     * @this HTMLElement
     * @private
     */
    static _node_toggleClass(cName) {
        this.classList.toggle(cName);
        return this;
    };

	/**
	 * Remove element class (single or multiple)
	 * @param {String} cName - class names to be checked
     * @this HTMLElement
     * @private
	 */
	static _node_hasClass(cName) {
		return this.classList.contains(cName);
	};
}

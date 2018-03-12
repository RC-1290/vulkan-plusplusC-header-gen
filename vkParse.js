/*
Copyright 2017 Code Animo.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

"use strict";

// namespaces:
var vulkanNamespace = "Vk";
var newCodeNamespace = "CodeAnimo";
var newCodeNamespace2 = "Vulkan";// nested namespace.
var ProccAddrLookupImplDefine = "IMPLEMENT_VK_COMMAND_LOOKUP";

// 
var max_enum = "0x7FFFFFFF";

// Formatting settings:
var tab = "	";
var tabSpaceWidth = 4;// If you change this, you might want to change the css too.

// Replacement Types:
var x8 = "x8";// signed/undefined 8-bit (compiler dependent)
var u32 = "u32";// unsigned 32-bit
var s32 = "s32";// signed 32-bit
var u64 = "u64";// unsigned 64-bit
var f32 = "f32";// 32-bit floating point

// Vulkan function call settings:
var VKAPI_ATTR = "";// used on Android
var VKAPI_CALL = "";// calling convention
var VKAPI_PTR = "";

var funcRenaming = "aliaspfn";

var headerVersion;

initializeDefaultStore("typRepl char", x8);
initializeDefaultStore("typRepl uint8_t", "u8");
initializeDefaultStore("typRepl uint32_t", u32);
initializeDefaultStore("typRepl int32_t", s32);
initializeDefaultStore("typRepl int", s32);
initializeDefaultStore("typRepl uint64_t", u64);
initializeDefaultStore("typRepl float", f32);

initializeDefaultStore("typRepl HANDLE", "Windows::Handle");
initializeDefaultStore("typRepl HINSTANCE", "Windows::Handle");
initializeDefaultStore("typRepl HWND", "Windows::Handle");
initializeDefaultStore("typRepl SECURITY_ATTRIBUTES", "Windows::SecurityAttributes");
initializeDefaultStore("typRepl DWORD", u32);
initializeDefaultStore("typRepl LPCWSTR", "const u16*");

var statusText =				document.getElementById("statusText");
var featureList =				document.getElementById("featureSelection");
var extensionList = 			document.getElementById("extensionSelection");
var headerVersionSpan =			document.getElementById("headerVersion"); 

var vulkanHeaderDiv =			document.getElementById("vulkanHeader");

//
var parseTextButton =			document.getElementById("parseTextButton");
var localVkXmlBtn =				document.getElementById("localVkXmlBtn");
var headerSelectBtn =			document.getElementById("headerSelectBtn");
var headerCpyBtn =				document.getElementById("copyBtn");
var clearXmlTextBtn =			document.getElementById("clearXmlTextBtn");
var loadRawGithubBtn =			document.getElementById("loadRawGithubBtn");

var vkxmlTextInput = 			document.getElementById("vkxmlText");
var extraIncludesDiv =			document.getElementById("extraIncludes");
var customIncludeInput =		document.getElementById("customInclude");
var vulkanNamespaceInput =		document.getElementById("vulkanNamespace");
var implementationDefineInput =	document.getElementById("implementationDefine");
var callingConventionSelect =	document.getElementById("callingConvention");
var funcRenamingSelect =		document.getElementById("funcRenaming");
var useProtectInput =			document.getElementById("useProtect");

var typeReplacementList =		document.getElementById("typeReplacement");

var createHeaderButton =		document.getElementById("createHeaderButton");

var setupStuff = 				document.getElementById("setupStuff");
var setupPart2 =				document.getElementById("setupPart2");

setInitialHistory();
window.addEventListener("popstate", onHistoryPop);

let ranBefore = localStorage.getItem("ranBefore");

restoreInput("customInclude", customIncludeInput);
restoreInput("vulkanNamespace", vulkanNamespaceInput);
restoreInput("implementationDefine", implementationDefineInput);
restoreSelect("callingConventionSelect", callingConventionSelect);
restoreSelect("funcRenamingSelect", funcRenamingSelect);
restoreCheckbox("useProtect", useProtectInput);

var availableFeatures;
var availableExtensions
var availableInterfaces;
var availablePlatforms;

var flags;
var interfaces;

statusText.textContent = "Ready for action. Load some XML first.";
var xhr = new XMLHttpRequest();
var xmlSource = "";

clearXmlTextBtn.addEventListener("click", clearText);
parseTextButton.addEventListener("click", parseText);
localVkXmlBtn.addEventListener("click", loadLocal);
loadRawGithubBtn.addEventListener("click", loadFromGithub);

var headerSelectBtn = document.getElementById("headerSelectBtn");
var headerCpyBtn = document.getElementById("copyBtn");
var downloadBtn = document.getElementById("downloadBtn");
headerSelectBtn.addEventListener( "click", selectHeader);
headerCpyBtn.addEventListener("click", copyHeader);

if (!vkxmlTextInput.value)
{
	loadLocal();
}
else 
{
	statusText.textContent = "XML textfield populated with cached contents.";
}

function setInitialHistory()
{
	let historyState = {};
	historyState.status = statusText.textContent;
	historyState.headerCreated = false;
	historyState.header = vulkanHeaderDiv.innerHTML;
	window.history.replaceState(historyState,"Start");
}

function onHistoryPop(event)
{
	vulkanHeaderDiv.innerHTML = event.state.header;
	statusText.textContent = event.state.status;
	
	if (event.state.headerCreated)
	{
		displayHeader(event.state.header);
	}
	else
	{
		hideHeaderShowSettings();
	}
}

function initializeDefaultStore(key, value)
{
	if (!localStorage.getItem(key))
	{
		localStorage.setItem(key, value);
	}
}

function restoreInput(localStoreKey, input)
{
	if (ranBefore)
	{
		let restored = localStorage.getItem(localStoreKey);
		if (restored)
		{
			input.value = restored;
		}
	}
	else if (input.placeholder)
	{
		input.value = input.placeholder;
	}
}

function restoreSelect(localStoreKey, select)
{
	if (ranBefore)
	{
		let restored = localStorage.getItem(localStoreKey);
		if (restored)
		{
			select.selectedIndex = restored;
		}
	}
}

function restoreCheckbox(localStoreKey, checkbox)
{
	if (ranBefore)
	{
		let restored = localStorage.getItem(localStoreKey);
		if (restored === null)
		{ return; }
	
		checkbox.checked = restored == "false" ? false : true; 
	}
}

function clearText()
{
	statusText.textContent = "text cleared";
	vkxmlTextInput.value = "";
	xmlSource = "";
}

function loadLocal()
{
	xmlSource = "(possibly outdated) local copy";
	loadTextXhr("vk.xml");
}

function loadFromGithub()
{
	xmlSource = "GitHub";
	loadTextXhr("https://raw.githubusercontent.com/KhronosGroup/Vulkan-Docs/master/src/spec/vk.xml");
}


function loadTextXhr(url)
{
	statusText.textContent = "Trying to open vk.xml";
	let async = true;
	xhr.addEventListener("load", onXhrLoad);
	xhr.open("GET", url, async);
	xhr.send();
}

function parseText()
{
	setupPart2.removeAttribute("class");
	
	statusText.textContent = "Trying to open vk.xml";
	let xmlParser = new DOMParser();
	let vkxml = xmlParser.parseFromString(vkxmlTextInput.value, "application/xml");
	if (vkxml.documentElement.nodeName != "parsererror")
	{	
		readXML(vkxml);
	}
	else
	{
		statusText.textContent = "Could not parse xml, are you sure it is valid xml?";
	}
}

function onXhrLoad()
{
	if (this.status === 200)
	{
		if (this.responseType == "" || this.responseType == "text")
		{
			statusText.textContent = "vk.xml loaded from " + xmlSource + ". If this is the version you want to use, press \"List Features/Extensions\" to continue...";
			vkxmlTextInput.value = this.responseText;
		}
		else
		{
			statusText.textContent = "The XHR request did not return a valid XML document.";
		}
	}
	else 
	{
		statusText.textContent = "xhr failed: " + xhr.statusText;
		console.error("xhr failed: " + this.statusText);
	}
}

function readXML(vkxml)
{
	// Clear placeholder text and previous lists
	featureList.textContent = "";
	extensionList.textContent = "";
	typeReplacementList.textContent = "";
	
	availableFeatures = new Map();
	availableExtensions = new Map();
	availableInterfaces = new Map();
	availablePlatforms = new Map();
	headerVersion = "";
	for (let node of vkxml.childNodes.values())
	{
		if (!node.nodeType == Node.ELEMENT_NODE) { continue; }
		
		if (node.tagName == "registry") { parseRegistry(node); }
	}
	
	listFeatures();
}

function parseRegistry(xml)
{
	for (let node of xml.childNodes.values())
	{
		if (node.nodeType != Node.ELEMENT_NODE) { continue; }
		
		switch(node.tagName)
		{
			case "comment":
			case "vendorids":
			case "tags":
				//ignore
			break;
			case "types":
				parseTypes(node);
				break;
			case "enums":
				parseEnums(node);
				break;
			case "commands":
				parseRegistry(node);
				break;
			case "command":
				parseCommand(node);
				break;
			case "feature":
				parseFeature(node);
				break;
			case "extensions":
				parseRegistry(node);
				break;
			case "extension": 
				parseExtension(node);
			break;
			case "platforms":
				parsePlatforms(node);
			break;
			default:
				console.warn("unexpected tagName: " + node.tagName);
				break;
		}
	}

	// Alias processing:
	for( let interf of availableInterfaces.values())
	{
		switch (interf.category)
		{
			case "COMMAND_ALIAS":
			{
				// Become a copy of the alias, except for the name:
				let aliasedCommand = availableInterfaces.get(interf.aliasFor);
				if (!aliasedCommand){	console.error("Could not find the aliased command with the name: " + interf.aliasFor);	}
				interf.parameters = aliasedCommand.parameters;
				interf.returnType = aliasedCommand.returnType;
				interf.category = aliasedCommand.category;
			}
			break;
			case "CONSTANT_ALIAS":
			{
				let aliasedConstant = availableInterfaces.get(interf.aliasFor);
				if (!aliasedConstant){	console.error("Could not find the aliased constant with the name: " + interf.aliasFor);	}
				interf.value = aliasedConstant.name;
				interf.type = aliasedConstant.type;
				interf.category = "constant";
			}
			break;
		}
	}

}

function parseTypes(xml)
{	
	var typeNodes = xml.children;
	for(let i = 0; i < typeNodes.length; ++i)
	{
		var typeNode = typeNodes.item(i);
		if (typeNode.tagName == "comment") { continue; }
		
		let namedThing = {};
		namedThing.name = typeNode.getAttribute("name");
		if (!namedThing.name)
		{
			let nameTags = typeNode.getElementsByTagName("name");
			if (nameTags.length > 0){	namedThing.name = nameTags.item(0).textContent;	}
		}
		
		if (typeNode.hasAttribute("alias"))
		{
			namedThing.aliasFor = typeNode.getAttribute("alias");
			namedThing.category = "TYPE_ALIAS";
		}
		else if (typeNode.hasAttribute("category"))
		{
			namedThing.category = typeNode.getAttribute("category");
		}
		else
		{
			namedThing.category = "EXTERNAL";// capitalized category to avoid collision with future new categories.
		}
		
		if (typeNode.hasAttribute("requires")) {	namedThing.requiredTypes = typeNode.getAttribute("requires");	}

		switch(namedThing.category)
		{
			case "funcpointer":		
			{
				namedThing.parameters = [];
				namedThing.preName = "";
				namedThing.postName = "";
				
				let currentParameter;
				let nameFound = false;
				let nameComplete = false;
				
				let childNodes = typeNode.childNodes;
				let nextPreType = "";
				
				for( let j = 0; j < childNodes.length; ++j)
				{
					let childNode = childNodes.item(j);
					let nodeText = childNode.textContent;
					
					if (!nameComplete)
					{
						if (childNode.tagName == "name")
						{
							nameFound = true;
							namedThing.name = nodeText;
						}	
						else if (!nameFound) { namedThing.preName += nodeText;	}	
						else if (childNode.tagName != "type"){	namedThing.postName += nodeText;	}
						else {	nameComplete = true;	}
					}
					
					if (nameComplete)
					{
						if (childNode.tagName == "type")
						{
							currentParameter = {};
							currentParameter.preType = nextPreType;
							nextPreType = "";
							currentParameter.postType = "";
							namedThing.parameters.push(currentParameter);
							currentParameter.type = nodeText;
						}
						else
						{
							let parameterSplit = nodeText.split(",");
							
							if (parameterSplit.length == 2)
							{
								currentParameter.postType += parameterSplit[0].trim() + ",";
								nextPreType = parameterSplit[1].trimLeft();
							}
							else if (parameterSplit.length == 1)
							{
								currentParameter.postType += parameterSplit[0].trim();
							}
							else
							{
								console.error("Unexpected number of commas(expected 1): " + nodeText);
							}
						}
					}
				}
				
				for(let j = 0;j < namedThing.parameters.length; ++j)
				{
					let parameter = namedThing.parameters[j];
					
					let tabsRemoved = parameter.postType.split(" ");
					
					if (tabsRemoved.length > 0)
					{
						parameter.name = tabsRemoved[tabsRemoved.length - 1];
						parameter.postType = "";
						for(let k = 0; k < tabsRemoved.length - 1; ++k)
						{
							parameter.postType += tabsRemoved[k];
						}
					}
				}
				
				availableInterfaces.set(namedThing.name, namedThing);
				break;
			}
			case "bitmask":
			case "basetype":
			{
				// Specific data is in the child nodes:
				var typeChildNodes = typeNode.childNodes;
				for (var j = 0; j < typeChildNodes.length; ++j)
				{
					let node = typeChildNodes.item(j);
					switch (node.tagName)
					{
						case "name":
							namedThing.name = node.textContent;
							break;
						case "type":
							namedThing.type = node.textContent;
							break;
						
					}
				}
				if (namedThing.name)
				{
					availableInterfaces.set(namedThing.name, namedThing);
				}
				
				break;
			}
			case "struct":
			case "union":
			{
				namedThing.members = [];
				availableInterfaces.set(namedThing.name, namedThing);
				
				var memberNodes = typeNode.children;
				for(var j = 0; j < memberNodes.length; ++j)
				{
					
					var memberNode = memberNodes.item(j);
					if (memberNode.tagName != "member")
					{
						continue;
					}
					var member = {};
					member.preType = ""
					member.postType = "";
					member.preEnum = "";
					member.cEnum = "";
					member.postEnum = "";
					namedThing.members.push(member);

					var memberTags = memberNode.childNodes;
					for(var h = 0; h < memberTags.length; ++h)
					{
						var memberTag = memberTags.item(h);
						
						switch(memberTag.nodeType)
						{
							case Node.ELEMENT_NODE:
								if (memberTag.tagName == "type")
								{
									member.type = memberTag.textContent;
								}
								else if (memberTag.tagName == "name")
								{
									member.name = memberTag.textContent;
								}
								else if (memberTag.tagName == "enum")
								{
									member.cEnum = memberTag.textContent;
								}
							break;
							case Node.TEXT_NODE:
								let contents = memberTag.textContent;
								
								if (!member.type){	member.preType += contents;	}//e.g.: void
								else if (!member.name)	{ member.postType += contents; }// e.g.: *
								else if (!member.cEnum)	{ member.preEnum += memberTag.textContent.trim(); }//e.g.: [ in [someArray]
								else					{ member.postEnum += memberTag.textContent.trim(); }//e.g.: ] in [someArray]
							break;
						}
					}
					
				}
				break;
			}
			
			case "define":
			{			
				// Just parsing header version:
				var typeChildNodes = typeNode.childNodes;
				for (var j = 0; j < typeChildNodes.length; ++j)
				{
					let node = typeChildNodes.item(j);
					if (node.tagName == "name")
					{
						namedThing.name = node.textContent;
						if (node.textContent == "VK_HEADER_VERSION")
						{
							let nextIndex = j + 1;
							if (nextIndex >= typeChildNodes.length){	break;	}
							
							let nextNode = typeChildNodes.item(nextIndex);
							if (headerVersion)
							{
								console.warn("more than one header version detected. That's odd.");
							}
							headerVersion = parseInt(nextNode.textContent);
						}
					
					}
				}

				switch(namedThing.name)
				{
					case "VK_API_VERSION_1_0":
					{
						namedThing.category = "constant";
						namedThing.type = u32;
						namedThing.value = 0x400000; 
					}
					break;
					case "VK_API_VERSION_1_1":
					{
						namedThing.category = "constant";
						namedThing.type = u32;
						namedThing.value = 0x401000; 
					}
					break;
				}


				availableInterfaces.set(namedThing.name, namedThing);
			}
			break;
			default:
			{		
				if (namedThing.name){	availableInterfaces.set(namedThing.name, namedThing);	}
				break;
			}
				
		}
		
	}	
}

function parseEnums(enumsNode)
{
	var enumName = enumsNode.getAttribute("name");
	let enumType = enumsNode.getAttribute("type");
	if (!enumType)//"API Constants"
	{
		// constants:
		var constants = enumsNode.children;
		for(let i = 0; i < constants.length; ++i)
		{
			var constantNode = constants.item(i);
			
			var constant = {};
				
			constant.category = "constant";
			constant.name = constantNode.getAttribute("name");
			availableInterfaces.set(constant.name, constant);
			
			if (constantNode.getAttribute("alias"))
			{
				constant.category = "CONSTANT_ALIAS";
				constant.aliasFor = constantNode.getAttribute("alias");
			}
			else
			{
				constant.value = constantNode.getAttribute("value");
				if (!constant.value)
				{
					let bitPos = constantNode.getAttribute("bitPos");
					if (!bitPos){	continue;	}
					constant.value = constant.value = "(1 << " + bitPos + ")";
				}
				constant.type = u32;
				constant.type = determineType(constant.value);
			}
		}
	}
	else
	{
		// enums:	
		let cEnum = {};
		cEnum.category = "enum";
		cEnum.name = enumName;
		cEnum.constants = [];
		
		availableInterfaces.set(cEnum.name, cEnum);
		
		cEnum.isBitMask = enumType == "bitmask";
		
		cEnum.minName = "";
		let minValue = 0;
		cEnum.maxName = cEnum.minName;
		let maxValue = minValue;
		
		let enumEntry = enumsNode.children;
		for(let i = 0; i < enumEntry.length; ++i)
		{
			let constantNode = enumEntry.item(i);
			if (constantNode.tagName != "enum")
			{
				continue;
			}
			let constant = {};
			constant.name = constantNode.getAttribute("name");
			constant.value = parseInt(constantNode.getAttribute("value"), 0);

			if (constantNode.hasAttribute("alias"))
			{
				console.error("Found alias attribute on: " + constant + ". When this generator was written, the xml didn't use this, so support was omitted");
			}
			
			if (cEnum.isBitMask)
			{
				var constantBitPos = constantNode.getAttribute("bitpos");
				if (constantBitPos)
				{
					constant.value = "(1 << " + constantBitPos + ")";
				}
			}
			else if (!constantNode.getAttribute("extends"))
			{
				if (!cEnum.minName)
				{
					cEnum.minName = cEnum.maxName = constant.name;
					minValue = maxValue = constant.value;
				}
				else if (constant.value < minValue)
				{
					cEnum.minName = constant.name;
					minValue = constant.value;
				}
				else if (constant.value > maxValue) 
				{
					cEnum.maxName = constant.name;
					maxValue = constant.value;
				}
			}
			cEnum.constants.push(constant);
		}
	}
}

function parseCommand(xml)
{
	let command = {};
	command.category = "command";
	if (xml.hasAttribute("alias"))
	{
		command.category = "COMMAND_ALIAS"
		command.aliasFor = xml.getAttribute("alias");
		command.name = xml.getAttribute("name");
		availableInterfaces.set(command.name, command);
		return;
	}

	command.parameters = [];		

	var protoNode = xml.getElementsByTagName("proto").item(0);
	if (!protoNode){ return;}
	
	command.returnType = protoNode.getElementsByTagName("type").item(0).textContent;
	command.name = protoNode.getElementsByTagName("name").item(0).textContent;
	
	var commandChildren = xml.children;
	
	for(let j=0; j < commandChildren.length; ++j)
	{
		var commandChild = commandChildren.item(j);
		if (commandChild.tagName != "param")
		{
			continue;
		}
		
		let parameter = {};
		parameter.preType = "";
		parameter.postType = "";
		
		var nodes = commandChild.childNodes;
		
		for(let k = 0; k < nodes.length; ++k)
		{
			var node = nodes.item(k);
			
			if (!parameter.type)
			{
				if (node.tagName != "type")	{	parameter.preType += node.textContent;	}
				else						{	parameter.type = node.textContent;	}
			}
			else 
			{
				if (node.tagName != "name") {
					if (!parameter.name){	parameter.postType += node.textContent; }
					else 				{	parameter.name += node.textContent;	}
				}
				else {	parameter.name = node.textContent;	}
			}
		}
		command.parameters.push(parameter);
	}
	availableInterfaces.set(command.name, command);
}

function parseFeature(xml)
{
	var feature = {};

	feature.api = xml.getAttribute("api");
	feature.name = xml.getAttribute("name");
	feature.version = xml.getAttribute("number");
	feature.description = xml.getAttribute("comment");
	
	availableFeatures.set(feature.name, feature);
	
	feature.requires = parseRequires(xml.childNodes);
}

function parseExtension(xml)
{
	var extension = {};
	
	extension.support = xml.getAttribute("supported");
	if (extension.support == "disabled") { return; }
	extension.name = xml.getAttribute("name");
	availableExtensions.set(extension.name, extension);
	extension.number = parseInt(xml.getAttribute("number"));
	extension.contact = xml.getAttribute("contact");
	extension.type = xml.getAttribute("type");
	extension.protect = xml.getAttribute("protect");
	extension.platform = xml.getAttribute("platform");
	
	// Parse which other extensions are required
	extension.requiredExtensions = xml.getAttribute("requires");
	if (extension.requiredExtensions)
	{
		extension.dependencies = extension.requiredExtensions.split(",");
		for (let dependency of extension.dependencies)
		{
			dependency = dependency.trim();
		}
	}

	extension.requires = parseRequires(xml.childNodes, extension.number);
	
}

function parseRequires(nodeList, fallbackExtensionNumber)
{
	let requires = [];
	for (let requireOrRemoveNode of nodeList.values())
	{
		if (requireOrRemoveNode.nodeType != Node.ELEMENT_NODE) { continue; }
		if (requireOrRemoveNode.tagName != "require")
		{
			console.error("Currently only require nodes are supported. Extension name: " + extension.name);
			continue;
		}
		
		let require = {};
		requires.push(require);

		require.interfaces = [];
		require.onlyForExtension = requireOrRemoveNode.getAttribute("extension");
		require.onlyForFeature = requireOrRemoveNode.getAttribute("feature");
		
		if (requireOrRemoveNode.getAttribute("profile"))
		{
			console.error("When this generator was written, profiles weren't used by extension requires, so they're currently not supported.");
		}
		
		for (let symbolNode of requireOrRemoveNode.childNodes.values())
		{
			if (symbolNode.nodeType != Node.ELEMENT_NODE) { continue; }
			let type = {};
			
			type.name = symbolNode.getAttribute("name");
			
			switch(symbolNode.tagName)
			{
				case "enum":
					type.extending = symbolNode.getAttribute("extends");
					type.form = type.extending ? "extensionEnum" : "constant";
					
					// Value might come from various sources:
					if (symbolNode.hasAttribute("value"))
					{
						type.value = symbolNode.getAttribute("value");
						if (type.value != null && type.value.startsWith("VK_"))
						{
							type.form = "constEnumAlias";
						}
					}
					else if (symbolNode.hasAttribute("bitpos"))
					{
						let bitPos = symbolNode.getAttribute("bitpos");
						if (bitPos){	type.value = "(1 << " + bitPos + ")";	}
					}
					else if (symbolNode.hasAttribute("alias"))
					{
						type.aliasFor = symbolNode.getAttribute("alias"); 
					}
					else if (symbolNode.hasAttribute("offset"))
					{
						let offsetAttribute = symbolNode.getAttribute("offset");
						if (offsetAttribute)
						{
							let startingRange = symbolNode.getAttribute("extnumber");
							
							if (!startingRange)
							{
								startingRange = fallbackExtensionNumber;
								if (!fallbackExtensionNumber) { console.error("Can't determine extension number.");	}
							}
							let offset = parseInt(offsetAttribute);
							type.value = 1000000000 + offset + (1000 * (startingRange - 1))
							if (symbolNode.getAttribute("dir") == "-")
							{
								type.value = -type.value;
							}
						}
					}
					else
					{
						type.form = "reference";
					}
				break;
				case "type":
				case "command":
				case "TYPE_ALIAS":
					type.form = "reference";
				break;
			}			
			require.interfaces.push(type);
		}
		
	}
	return requires;
}

function parsePlatforms(xml)
{
	var platformNodes = xml.children;
	for(let i = 0; i < platformNodes.length; ++i)
	{
		var platformNode = platformNodes.item(i);
		if (platformNode.tagName != "platform") { continue; }

		let platform = {};
		platform.name = platformNode.getAttribute("name");
		platform.protectDefine = platformNode.getAttribute("protect");

		availablePlatforms.set(platform.name, platform);
	}
}


function determineType(text)
{
	// naive type analysis that only recognizes ULL (unsigned 64), f (float) or " (char* / c-string)
	for(let k = 0; k < text.length; ++k)
	{					
		switch(text[k])
		{
			case 'U':
				if (k > 0 && !isNaN(text[k-1]) && text[k+1] == "L" && text[k+2] == "L")
				{
					return u64;
				}
			break;
			case 'f':
				return f32;
			break;
			case '"':
				return "string";
			break;
		}
	}
	return u32;
}

function listFeatures()
{
	// Restoring previous selection:
	let selectedFeatures = localStorage.getItem("selectedFeatures");
	let selectedExtensions = localStorage.getItem("selectedExtensions");
	let ranBefore = localStorage.getItem("ranBefore");
	
	let featureSelectionMap = new Map();
	if (selectedFeatures)
	{
		for (let feature of selectedFeatures.split(","))
		{
			featureSelectionMap.set(feature, true);
		}
	}
	let extensionSelectionMap = new Map();
	if (selectedExtensions)
	{
		for (let extension of selectedExtensions.split(","))
		{
			extensionSelectionMap.set(extension, true);
		}
	}
	
	// List features:
	statusText.textContent = "Listing Features...";
	headerVersionSpan.textContent = headerVersion;
	
	var featureUl = document.createElement("ul");
	featureUl.setAttribute("class", "autoColumn");
	featureList.appendChild(featureUl);
	for (let feature of availableFeatures.values())
	{
		var featureLi = document.createElement("li");
		featureUl.appendChild(featureLi);
		feature.checkbox = addCheckbox(featureLi, feature.name, feature.description, feature.name + ", version: " + feature.version);
		
		if (ranBefore)
		{
			if (featureSelectionMap.get(feature.name)){	feature.checkbox.checked = true;	}
		}
		else 
		{
			feature.checkbox.checked = true;
		}
	}

	var extensionUl = document.createElement("ul");
	extensionUl.setAttribute("class", "autoColumn");
	extensionList.appendChild(extensionUl);	
	for(let extension of availableExtensions.values())
	{
		var extensionLi = document.createElement("li");
		extensionUl.appendChild(extensionLi);
		
		let tooltip = "[Type: " + extension.type + "] [Contact: " + extension.contact + "]";
		if (extension.requiredExtensions)
		{
			tooltip += " [Requires: " + extension.requiredExtensions + "]";
		}
		if (extension.platform)
		{
			tooltip += " [Platform: " + extension.platform + "]";
		}
		if (extension.protect)
		{
			tooltip += " [Protect: " + extension.protect + "]";
		}
		
		extension.checkbox = addCheckbox(extensionLi, extension.name, extension.name, tooltip);
		extension.checkbox.setAttribute("extensionName", extension.name);
		
		if (ranBefore)
		{
			if (extensionSelectionMap.get(extension.name)){	extension.checkbox.checked = true;	}
		}
		else 
		{
			extension.checkbox.checked = true;
		}
		
		extension.checkbox.addEventListener("change", checkboxChanged);
	}
	
	let checkAllButton = document.createElement("button");
	checkAllButton.textContent = "Check all";
	checkAllButton.addEventListener("click", checkAllExtensions);
	
	let uncheckAllButton = document.createElement("button");
	uncheckAllButton.textContent = "Uncheck all";
	uncheckAllButton.addEventListener("click", uncheckAllExtensions);
	
	extensionList.appendChild(checkAllButton);
	extensionList.appendChild(uncheckAllButton);

	
	// Type replacement interface:
	for( let interf of availableInterfaces.values())
	{
		if (interf.category == "EXTERNAL")
		{
			let typeEntry = document.createElement("li");
			typeEntry.title = interf.name;
			if (interf.requires)
			{
				typeEntry.title += " originally defined by: " + interf.requires;
			}
			
			let interfaceLabel = document.createElement("label");
			interf.input = document.createElement("Input");
			
			interfaceLabel.setAttribute("for", interf.name);
			interfaceLabel.textContent = interf.name;
			
			interf.input.setAttribute("id", interf.name);
			interf.input.setAttribute("type", "text");
			interf.input.value = localStorage.getItem("typRepl " + interf.name);
			if (!interf.input.value)
			{
				interf.input.value = interf.name;
			}
			
			typeEntry.appendChild(interfaceLabel);
			typeEntry.appendChild(interf.input);
			
			typeReplacementList.appendChild(typeEntry);
			
		}
	}

	createHeaderButton.addEventListener("click", createHeader);
	statusText.textContent = "Features listing complete. Select features and extensions and press \"Create Header\"...";
}

function checkAllExtensions()
{	
	for(let extension of availableExtensions.values())
	{
		extension.checkbox.checked = true;
	}
}

function uncheckAllExtensions()
{
	for(let extension of availableExtensions.values())
	{
		extension.checkbox.checked = false;
	}
}

function checkboxChanged()
{
	statusText.textContent = "Checkbox Selection updated, checking dependencies... (Note: Header creation saves changes.)"
	var changedExtension = availableExtensions.get(this.getAttribute("extensionName"));
	
	updateExtensionDependencies(changedExtension);
}

function updateExtensionDependencies(changedExtension)
{
	// Select extensions this depends on.
	if (changedExtension.checkbox.checked)
	{
		if (!changedExtension.dependencies){ return; }
		for (let dependencyName of changedExtension.dependencies)
		{
			let dependency = availableExtensions.get(dependencyName);
			if (dependency)
			{
				dependency.checkbox.checked = true;
				updateExtensionDependencies( dependency);
			}
		}
	}
	else // De-select extensions that depend on this.
	{
		for (let extension of availableExtensions.values())
		{
			if (!extension.dependencies){ continue; }
			for (let dependencyName of extension.dependencies)
			{
				if (dependencyName == changedExtension.name)
				{
					extension.checkbox.checked = false;
					updateExtensionDependencies(extension);
				}
			}
		}
	}
}

function replaceClassNodeContents(className, value)
{
	let toReplaceNodes = document.getElementsByClassName(className);
	for (let toReplace of toReplaceNodes)
	{
		toReplace.textContent = value;
	}
}

function registerRequires(requires)
{
	for (let require of requires)
	{
		// Skip this require for extensions that aren't enabled.
		if (require.onlyForExtension)
		{
			let found = availableExtensions.get((require.onlyForExtension));
			if (!found){ continue; }
			else if (!found.checkbox.checked){	continue;}
		}
		// Skip this require for features that aren't enabled.
		if (require.onlyForFeature)
		{
			let found = availableFeatures.get((require.onlyForFeature));
			if (!found){ continue; }
			else if (!found.checkbox.checked){	continue;}
		}
		
		for (let interf of require.interfaces)
		{
			switch(interf.form)
			{
				case "extensionEnum":
				{
					let cEnum = availableInterfaces.get(interf.extending);
					if (!cEnum)
					{
						console.error("extended enum not found: " + interf.extending);
						break;
					}
					let constant = {};
					constant.name = interf.name;

					// There are now duplicate enum entries in vk.xml, so we have to ignore those:
					let uniqueConstant = true;
					for (let i = 0; i < cEnum.constants.length; ++i)
					{
						if (cEnum.constants[i].name == constant.name){ uniqueConstant = false; break;}
					}
					if (!uniqueConstant){ break; }

					if (interf.aliasFor)
					{
						constant.value = interf.aliasFor;
						constant.isAlias = true;
					}
					else { constant.value = interf.value; }
					
					
					cEnum.constants.push(constant);
				}
				break;
				case "constant":
				{
					let constant = {};
					constant.name = interf.name;
					constant.category = "constant";
					availableInterfaces.set(constant.name, constant);// make constants added by extensions available
					registerSymbol(interf.name);
					if (interf.aliasFor)
					{
						let aliasedConstant = availableInterfaces.get(interf.aliasFor);
						if (!aliasedConstant)
						{
							console.error("Could not find referenced aliased constant with name: " + interf.aliasFor);
						}
						else
						{
							constant.value = interf.aliasFor;
							constant.type = aliasedConstant.type;
						}
					}
					else
					{
						constant.value = interf.value;
						constant.type = determineType(constant.value);
					}
				}
				break;
				case "reference":
					registerSymbol(interf.name);
				break;
				case "constEnumAlias":
					// Ignore constant Enum aliases for now...
				break;
			}		
		}
	}
}

function createHeader()
{
	statusText.textContent = "Applying custom settings:";
	
	flags = [];
	interfaces = [];
	
	var interfacesDiv =				document.getElementById("interfaces");
	var externPfnDiv =				document.getElementById("externPfns");
	var cmdDefsDiv =				document.getElementById("cmdDefs");
	var independentCmdLoadingDiv =	document.getElementById("independentCmdLoading");
	var instanceCmdLoadingDiv =		document.getElementById("instanceCmdLoading");
	var linkedFunctionsDiv =		document.getElementById("linkedFunctions");
	var functionAliasesDiv =		document.getElementById("functionAliases");
		
	window.scroll(0,150);
	setupStuff.setAttribute("class", "hidden");
	document.getElementById("hiddenUntilCreation").removeAttribute("class");
	
	if (customIncludeInput.value)
	{
		addLineOfCode(extraIncludesDiv, "#include \"" + customIncludeInput.value + "\"");
	}
	if (vulkanNamespaceInput.value)
	{
		vulkanNamespace = vulkanNamespaceInput.value;
		replaceClassNodeContents("namespaceVulkan", vulkanNamespace);
	}
	if (implementationDefineInput.value)
	{
		ProccAddrLookupImplDefine = implementationDefineInput.value;
		replaceClassNodeContents("ProccAddrLookupImplDefine", ProccAddrLookupImplDefine);
	}
	
	switch(callingConventionSelect.selectedOptions.item(0).value)
	{
		case "default":
			VKAPI_ATTR = VKAPI_CALL = VKAPI_PTR = "";
		break;
		case "hardfloat":
			VKAPI_PTR = VKAPI_ATTR = "__attribute__((pcs(\"aapcs-vfp\")))";
			VKAPI_CALL = "";
		break;
		case "stdcall":
			VKAPI_PTR = VKAPI_CALL = "__stdcall";
			VKAPI_ATTR = "";
		break;
	}
	funcRenaming = funcRenamingSelect.selectedOptions.item(0).value;
	

	// Remember which features and extensions were used this time, so they can be stored for next session.:
	let selectedFeatures = "";
	let selectedExtensions = "";
	
	// Sort by usage:
	statusText.textContent = "Sorting commands, types and enums by usage...";
	for(let feature of availableFeatures.values())
	{
		if (!feature.checkbox.checked) { continue; }
		selectedFeatures += feature.name + ","
		
		registerRequires(feature.requires);
	}

	statusText.textContent = "Applying extensions";
	for (let extension of availableExtensions.values())
	{
		if (!extension.checkbox.checked) { continue; }
		selectedExtensions += extension.name + ",";

		// figure out if the extension is supported
		let noMatchFound = true;
		for (let feature of availableFeatures.values())
		{
			if (!feature.checkbox.checked) { continue; }
			let exactMatchTest = RegExp('^'+ extension.support + '$');
			if (exactMatchTest.test(feature.api))
			{
				noMatchFound = false;
				break;
			}
		}
		if (noMatchFound)
		{
			console.error("extension "+ extension.name + " not supported, skipping...");
			continue;
		}

		registerRequires(extension.requires);
		
		// Add protect information for registered interfaces:
		if (useProtectInput.checked)
		{
			if (extension.platform)
			{
				if (extension.protect)
				{
					console.error("When this generator was written, nothing used both protect and platform tags... so that's not supported. But used on"+ extension);
				}
				let platform = availablePlatforms.get(extension.platform);
				if (!platform)
				{
					console.error("The referenced platform could not be found: "+ extension.platform);
					continue;
				}
				extension.protect = platform.protectDefine;
			}

			for (let require of extension.requires)
			{	
				for (let interf of require.interfaces)
				{
					if (extension.protect )
					{
						let target = availableInterfaces.get(interf.name);
						if (target)
						{
							target.protect = extension.protect;
						}
					}
				}
			}
		}
	}

	statusText.textContent = "Saving state for next run...";
	
	localStorage.setItem("ranBefore", true);
	localStorage.setItem("selectedFeatures", selectedFeatures);
	localStorage.setItem("selectedExtensions", selectedExtensions);
	
	localStorage.setItem("customInclude", customIncludeInput.value);
	localStorage.setItem("vulkanNamespace", vulkanNamespaceInput.value);
	localStorage.setItem("implementationDefine", implementationDefineInput.value);
	
	localStorage.setItem("callingConventionSelect", callingConventionSelect.selectedIndex);
	localStorage.setItem("funcRenamingSelect", funcRenamingSelect.selectedIndex);
	localStorage.setItem("useProtect", useProtectInput.checked);
	
	var typeReplacements = new Map();
	
	for( let interf of availableInterfaces.values())
	{
		if (interf.category == "EXTERNAL")
		{
			localStorage.setItem("typRepl " + interf.name, interf.input.value);
			typeReplacements.set(interf.name, interf.input.value);
		}
	}
	
	
	// Replace types and changes names:
	statusText.textContent = "Replacing type names...";
	
	x8 = localStorage.getItem("typRepl char");
	u32 = localStorage.getItem("typRepl uint32_t");
	s32 = localStorage.getItem("typRepl int32_t");
	u64 = localStorage.getItem("typRepl uint64_t");
	f32 = localStorage.getItem("typRepl float");
	
	for(let i = 0; i < flags.length; ++i)
	{
		let flag = flags[i];
		typeReplacements.set(flag.name, u32);
	}
	for (let i = 0; i < interfaces.length; ++i)
	{
		let interf = interfaces[i];
		switch(interf.category)
		{
			case "struct":
			case "union":
				interf.originalName = interf.name;
				interf.name = stripVk(interf.name);
				
				for (let j = 0; j < interf.members.length; ++j)
				{
					let member = interf.members[j];
					member.type = typeReplacement(member.type, typeReplacements);
					
					if (member.cEnum)
					{
						member.cEnum = typeReplacement(member.cEnum, typeReplacements);
					}
				}
				
				typeReplacements.set(interf.originalName, interf.name);
			break;
			case "funcpointer":
				interf.originalName = interf.name;
				interf.name = "_" + stripVk(stripPFN(interf.name));
				interf.preName = interf.preName.replace(/\bVkBool32\b/, "Bool32");// manual replacement, since the xml lacks return type markup.
				interf.preName = interf.preName.replace(/\bVKAPI_PTR\b/, VKAPI_PTR);
				
				
				for (let j = 0; j < interf.parameters.length; ++j)
				{
					let parameter = interf.parameters[j];
					parameter.type = typeReplacement(parameter.type, typeReplacements);
				}
				
				typeReplacements.set(interf.originalName, "PFN::" + interf.name);
			break;
			case "basetype":
				interf.originalName = interf.name;
				interf.name = stripVk(interf.name);
				
				interf.type = typeReplacement(interf.type, typeReplacements);
				
				typeReplacements.set(interf.originalName, interf.name);
			break;
			case "constant":
			{
				interf.originalName = interf.name;
				interf.name = stripVk(interf.name);
				typeReplacements.set(interf.originalName, interf.name);
				
				// enum alias renaming:
				interf.value = typeReplacement(interf.value, typeReplacements);
			}
			break;
			case "enum":
			{
				interf.originalName = interf.name;
				interf.name = stripVk(interf.name);
				
				for (let j = 0; j < interf.constants.length; ++j)
				{
					let constant = interf.constants[j];
					constant.originalName = constant.name;
					constant.name = stripEnumName(constant.name, interf.originalName);
					typeReplacements.set(constant.originalName, interf.name + "::" + constant.name);

					if (constant.isAlias)
					{
						constant.value = stripEnumName(constant.value, interf.originalName);
					}
				}
				if (!interf.isBitMask)
				{
					interf.minName = stripEnumName(interf.minName, interf.originalName);
					interf.maxName = stripEnumName(interf.maxName, interf.originalName);
				}
				
				typeReplacements.set(interf.originalName, interf.name);
			}
			break;
			case "handle":
			{
				interf.originalName = interf.name;
				interf.name = stripVk(interf.name);
				typeReplacements.set(interf.originalName, interf.name);
			}
			break;
			case "command":
			{
				interf.originalName = interf.name;
				interf.name = stripVk(interf.name);
				
				interf.returnType = typeReplacement(interf.returnType, typeReplacements);
				
				for (let j = 0; j < interf.parameters.length; ++j)
				{
					let parameter = interf.parameters[j];
					parameter.type = typeReplacement(parameter.type, typeReplacements);
				}
			}
			break;
			case "TYPE_ALIAS":
			{
				// If funcpointer aliases are ever used, they're going to require some special attention:
				let aliasedInterface = availableInterfaces.get(interf.aliasFor);
				if (aliasedInterface && aliasedInterface.category == "funcpointer")
				{
					console.error("Encountered an alias for a funcpointer. When writing this generator, there were no aliases for funcpointers, so their different renaming requirements have not been taken into account.");
				}

				// Name changes:
				interf.originalName = interf.name;
				interf.name = stripVk(interf.name);
				interf.aliasFor = typeReplacement(interf.aliasFor, typeReplacements);
			}
			break;
		}
	}
	
	let nodes = document.getElementsByClassName("typeReplace");
	for (let node of nodes)
	{
		node.textContent = typeReplacement(node.textContent, typeReplacements);
	}
	
	// Write header:
	statusText.textContent = "Writing Header...";

	if (headerVersion)
	{
		addLineOfCode(interfacesDiv, padTabs(padTabs(indentation(1) + "const " + u32, 16) + "HEADER_VERSION" + " = ", 90) + headerVersion + ";");
	}
	
	let lastCategory = "";
	let lastProtect = "";
	for (let i = 0; i < interfaces.length; ++i)
	{
		let interf = interfaces[i];
		
		let nextIndex = i + 1;
		if (interf.protect && interf.protect != lastProtect)
		{
			addLineOfCode(interfacesDiv, indentation(1));
			addLineOfCode(interfacesDiv, "#ifdef " + interf.protect);
		}
		
		switch(interf.category)
		{			
			case "struct":
			case "union":
			{
				addLineOfCode(interfacesDiv, indentation(1));
				addLineOfCode(interfacesDiv, indentation(1) + interf.category + " " + interf.name + " {");
				for (let j = 0; j < interf.members.length; ++j)
				{
					let member = interf.members[j];
					addLineOfCode(interfacesDiv, padTabs(indentation(2) + member.preType + member.type + member.postType, 89) + member.name + member.preEnum + member.cEnum + member.postEnum + ";");
				}
				addLineOfCode(interfacesDiv, indentation(1) + "};");
			}
			break;
			case "funcpointer":
			{
				addLineOfCode(interfacesDiv, indentation(1));
				
				if (lastCategory != interf.category)
				{
					addLineOfCode(interfacesDiv, indentation(1));
					addLineOfCode(interfacesDiv, indentation(1) + "namespace PFN {");
				}
				
				addLineOfCode(interfacesDiv, indentation(2) + interf.preName + interf.name + interf.postName.trim());
				
				for(let j= 0; j < interf.parameters.length; ++j)
				{
					let parameter = interf.parameters[j];
					addLineOfCode(interfacesDiv, padTabs(indentation(3) + parameter.preType + parameter.type + parameter.postType, 86) + parameter.name);
				}
				
				if (nextIndex >= interfaces.length || interfaces[nextIndex].category != interf.category)
				{
					addLineOfCode(interfacesDiv, indentation(1) + "}");
				}
			}
			break;
			case "basetype":
			{
				addLineOfCode(interfacesDiv, indentation(1));
				addLineOfCode(interfacesDiv, padTabs(indentation(1) + "typedef " + interf.type, 92) + interf.name + ";");
			}
			break;
			case "constant":
			{
				if (lastCategory != interf.category && lastCategory != "")
				{
					addLineOfCode(interfacesDiv, indentation(1));
				}
				
				let postName = "";
				if (interf.type == "string")
				{
					interf.type = x8;
					postName = "[]";
				}
				addLineOfCode(interfacesDiv, padTabs(padTabs(indentation(1) + "const " + interf.type, 16) + interf.name + postName + " = ", 90) + interf.value + ";");
			}
			break;
			case "enum":
			{
				let enumDiv = document.createElement("div");
				enumDiv.setAttribute("id", interf.name);
				interfacesDiv.appendChild(enumDiv);
				
				addLineOfCode( enumDiv, indentation(1));
				addLineOfCode(enumDiv, indentation(1) + "enum class " + interf.name);
				addLineOfCode(enumDiv, indentation(1) + "{");
				
				for( let j = 0; j < interf.constants.length; ++j)
				{
					let constant = interf.constants[j];
					addLineOfCode(enumDiv,  padTabs(indentation(2) + constant.name + " =", 89) + constant.value + ",");
				}
				
				if (!interf.isBitMask)
				{
					addLineOfCode( enumDiv, padTabs(indentation(2) + "BEGIN_RANGE =", 89) + interf.minName + ",");
					addLineOfCode( enumDiv, padTabs(indentation(2) + "END_RANGE =", 89) + interf.maxName + ",");
					addLineOfCode( enumDiv, padTabs(indentation(2) + "RANGE_SIZE =", 89) + "(" + interf.maxName + " - " + interf.minName + " + 1),");
				}
				
				addLineOfCode( enumDiv, padTabs(indentation(2) + "MAX_ENUM =", 89) + max_enum);
					
				addLineOfCode( enumDiv, indentation(1) + "};");
			}
			break;
			case "handle":
			{
				if (lastCategory != interf.category && lastCategory != "")
				{
					addLineOfCode(interfacesDiv, indentation(1));
				}
				let handleName = interf.name;
				addLineOfCode(interfacesDiv, padTabs(indentation(1) + "typedef struct " + handleName + "_Handle*", 92) + handleName + ";");
			}
			break;
			case "command":
			{
				if (lastCategory != interf.category)
				{
					addLineOfCode(interfacesDiv, indentation(1));
					addLineOfCode(interfacesDiv, indentation(1) + "namespace PFN {");
				}
				let parametersText = "";
				for(let j=0;j < interf.parameters.length; ++j)
				{
					if (j > 0) { parametersText += ","; }
					let parameter = interf.parameters[j];
					parametersText += "\n" + padTabs(indentation(3) + parameter.preType + parameter.type + parameter.postType, 86) + parameter.name;
				}
				
				addLineOfCode( interfacesDiv, padTabs(indentation(2) + "typedef " + interf.returnType, 24) + "(" + VKAPI_PTR + " *" + interf.name + ")(" + parametersText + ");" );
				addLineOfCode( interfacesDiv, indentation(2));
				
				if (nextIndex >= interfaces.length || interfaces[nextIndex].category != interf.category)
				{
					addLineOfCode(interfacesDiv, indentation(1) + "}");
				}
				
				if (interf.link == "lookup")
				{
					if (interf.protect)
					{
						addLineOfCode(externPfnDiv, "#ifdef " + interf.protect);
						addLineOfCode(cmdDefsDiv, "#ifdef " + interf.protect);
					}
					
					addLineOfCode(externPfnDiv, padTabs(indentation(1) + "extern PFN::" + interf.name, 68) + interf.name + ";");
					addLineOfCode(cmdDefsDiv,	padTabs(indentation(1) + "PFN::" + interf.name, 68) + interf.name + ";");
					
					if (interf.protect)
					{
						addLineOfCode(externPfnDiv, "#endif");
						addLineOfCode(cmdDefsDiv, "#endif");
					}
					
					
					if (interf.originalName == "vkEnumerateInstanceLayerProperties" || interf.originalName == "vkEnumerateInstanceExtensionProperties" || interf.originalName == "vkCreateInstance")
					{
						addLineOfCode(independentCmdLoadingDiv, indentation(3) + vulkanNamespace + '::' + interf.name + ' = (' + vulkanNamespace + '::PFN::' + interf.name + ') Vk::GetInstanceProcAddr( nullptr, "' + interf.originalName + '" );');
						// addLineOfCode(independentCmdLoadingDiv, indentation(3) + 'if(!' + vulkanNamespace + '::' + command.name + ') { return false; }');
					}
					else 
					{
						if (interf.protect)
						{
							addLineOfCode(instanceCmdLoadingDiv, "#ifdef " + interf.protect);
						}
						addLineOfCode(instanceCmdLoadingDiv, indentation(3) + vulkanNamespace + '::' + interf.name + ' = (' + vulkanNamespace + '::PFN::' + interf.name + ') Vk::GetInstanceProcAddr( instance, "' + interf.originalName + '" );');
						// addLineOfCode(instanceCmdLoadingDiv, indentation(3) + 'if(!' + vulkanNamespace + '::' + command.name + ') { return false; }');
						
						if (interf.protect)
						{
							addLineOfCode(instanceCmdLoadingDiv, "#endif");
						}
					}
				}
				else if (interf.link == "static")
				{
					if (interf.protect)
					{
						addLineOfCode(linkedFunctionsDiv, "#ifdef " + interf.protect);
						addLineOfCode(functionAliasesDiv, "#ifdef " + interf.protect);
					}
					
					
					addLineOfCode( linkedFunctionsDiv, indentation(2) + interf.returnType + " " + VKAPI_PTR + " " + interf.originalName + "(" + parametersText + ");" );
					addLineOfCode( linkedFunctionsDiv, indentation(2));
					
					addLineOfCode(functionAliasesDiv, padTabs(indentation(1) + "const PFN::" + interf.name, 68) + interf.name + " = " + interf.originalName + ";");
					
					
					if (interf.protect)
					{
						addLineOfCode(linkedFunctionsDiv, "#endif");
						addLineOfCode(functionAliasesDiv, "#endif");
					}
				}
			}
			break;
			case "TYPE_ALIAS":
			{
				addLineOfCode( interfacesDiv, padTabs(indentation(1) + "typedef " + interf.aliasFor, 68) + interf.name + ";" );
			}
			break;
		}
		
		if (interf.protect)
		{
			if (nextIndex >= interfaces.length || interfaces[nextIndex].protect != interf.protect)
			{
				addLineOfCode(interfacesDiv, "#endif");
			}
		}
		
		lastCategory = interf.category;
		lastProtect = interf.protect;
	}
	
	setupDownload(vulkanHeaderDiv.innerText);
	
	statusText.textContent = "Header completed writing.";
	
	let historyState = {};
	historyState.status = statusText.textContent;
	historyState.headerCreated = true;
	historyState.header = vulkanHeaderDiv.innerText;
	window.history.pushState(historyState, "Header displayed");
}

function typeReplacement(original, map)
{
	let replacement = map.get(original);
	if (replacement){	return replacement;	}
	else{	return original;	}
}

function registerSymbol(symbolName)
{
	let found = availableInterfaces.get(symbolName);
	if (found)
	{
		if (found.requiredTypes){
			registerSymbol(found.requiredTypes);
		}
		
		switch(found.category)
		{
			case "struct":
			case "union":
				for (let i = 0; i < found.members.length; ++i)
				{
					// Let's hope there's no circular references in the XML, otherwise this won't complete.
					let member = found.members[i];
					registerSymbol(member.type);
					if (member.cEnum)
					{
						registerSymbol(member.cEnum);
					}
				}
				pushIfNew(interfaces, found);
			break;
			case "command":
				if (symbolName == "vkGetDeviceProcAddr" || symbolName == "vkGetInstanceProcAddr")
				{
					found.link = "static";
				}
				else if (symbolName == "vkCreateDebugReportCallbackEXT" || symbolName == "vkDestroyDebugReportCallbackEXT")
				{
					found.link = "lookup";
				}
				else
				{
					found.link = funcRenaming;
				}
			
				registerSymbol(found.returnType);
				for (let i = 0; i < found.parameters.length; ++i)
				{
					registerSymbol(found.parameters[i].type);
				}
				pushIfNew(interfaces, found);
			break;
			case "funcpointer":
				// registerSymbol(found.type);
				for (let i = 0; i < found.parameters.length; ++i)
				{
					registerSymbol(found.parameters[i].type);
				}
				pushIfNew(interfaces, found);
			break;
			case "bitmask":
				pushIfNew(flags, found);
			break;
			case "enum":
			case "handle":
			case "constant":
			case "basetype":
			case "TYPE_ALIAS":
				pushIfNew(interfaces, found);
			break;
			case "include":
			case "define":
			case "EXTERNAL":
				// ignored...
			break;
			default:
				console.error("Unknown type category: '"  + found.category + "', on found: '" + found.name + "' of type: " + found.type + ". symbol name: "  + symbolName);
			break;
			
		}		
	}
	else {	console.error("symbol not found: " + symbolName); }
}

function setupDownload(text)
{
	statusText.textContent = "Setting up download button.";
	downloadBtn.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(text));
}

function selectHeader()
{
	var sel = window.getSelection();
	var range = document.createRange();
	range.selectNodeContents(vulkanHeaderDiv);
	sel.removeAllRanges();
	sel.addRange(range);
}

function copyHeader()
{
	let selection = window.getSelection();
	
	// Backup old selection:
	let rangesBackup = [];
	let backupRangeCount = selection.rangeCount;
	for(let i = 0; i< backupRangeCount; ++i)
	{
		rangesBackup.push(selection.getRangeAt(i));
	}
	
	// Select header
	selection.removeAllRanges();
	
	let range = document.createRange();
	range.selectNodeContents(vulkanHeaderDiv);
	selection.addRange(range);
	try
	{
		document.execCommand("copy");
		statusText.textContent = "Header copied";
	}
	catch(err)
	{
		console.error("copy is not supported in this browser");
	}
	
	// Restore old selection:
	selection.removeAllRanges();
	for(let i = 0; i< backupRangeCount; ++i)
	{
		selection.addRange(rangesBackup[i]);
	}
}

function stripPFN(text)
{
	if (text.startsWith("PFN_"))
	{
		return text.slice(4);
	}
	else 
	{
		return text;
	}
}

function stripVk(text)
{
	if (text.startsWith("VK_"))
	{
		return text.slice(3);
	}
	else if (text.startsWith("Vk") || text.startsWith("vk"))
	{
		return text.slice(2);
	}
	else 
	{
		return text;
	}
}

function stripEnumName(entryName, enumName)
{
	let nameIndex = 0;
	let entryIndex = 0;
	let underscoreIndex = 0;
	
	for(entryIndex = 0; entryIndex < entryName.length; ++entryIndex)
	{
		if (entryName[entryIndex] == "_")
		{
			underscoreIndex = entryIndex;
			continue;
		}
		else if(entryName[entryIndex].toUpperCase() == enumName.charAt(nameIndex).toUpperCase())
		{
			++nameIndex;
			continue;
		}
		else
		{
			break;
		}
	}
	
	let sliceIndex = underscoreIndex + 1;
	
	// Numbers can't be the first character of identifiers:
	if (!isNaN(entryName.charAt(sliceIndex)))
	{
		--sliceIndex;
	}
	
	if (sliceIndex > 0){	return entryName.slice(sliceIndex);	}
	else{	return entryName;	}
}

function addCheckbox(parent, name, label, tooltip)
{
	var checkboxId = name + "Checkbox";
	var featureCheckbox = document.createElement("input");
	featureCheckbox.setAttribute("type", "checkbox");
	featureCheckbox.setAttribute("id", checkboxId);
	var featureLabel = document.createElement("label");
	featureLabel.setAttribute("for", checkboxId);
	featureLabel.setAttribute("title", tooltip);
	featureLabel.textContent = label;
	
	parent.appendChild(featureCheckbox);
	parent.appendChild(featureLabel);
	
	return featureCheckbox;
}

function addLineOfCode(node, code)
{
	var codeLine = document.createElement("div");
	codeLine.textContent = code;
	node.appendChild(codeLine);
	return codeLine;
}

function indentation(count)
{
	var text = "";
	
	for(var i = 0; i < count; ++i)
	{
		text += tab;
	}
	
	return text;
}

function padTabs(text, length)
{
	var tabCount = Math.floor((length - text.length) / tabSpaceWidth);// Note, it would be more consistent by actually calculating character widths.
	return text + indentation(tabCount);
}

function pushIfNew( targetArray, targetObject)
{
	if (targetArray.indexOf(targetObject) == -1){	return targetArray.push(targetObject);	}
}


function hideHeaderShowSettings()
{
	document.getElementById("hiddenUntilCreation").setAttribute("class", "hidden");
	setupPart2.setAttribute("class", "hidden");
	setupStuff.removeAttribute("class");
}

function displayHeader(headerHTML)
{
	// window.scroll(0,150);
	vulkanHeaderDiv.innerHTML = headerHTML;
	setupDownload(vulkanHeaderDiv.innerText);
	setupStuff.setAttribute("class", "hidden");
	document.getElementById("hiddenUntilCreation").removeAttribute("class");
}
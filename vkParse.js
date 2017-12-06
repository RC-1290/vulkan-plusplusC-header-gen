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
var typeReplacements = new Map();
var s8 = "s8";// signed 8-bit
var u32 = "u32";// unsigned 32-bit
var s32 = "s32";// signed 32-bit
var ub32 = "ub32";// unsigned 32-bit boolean
var u64 = "u64";// unsigned 64-bit
var DeviceSize = u64;// GPU pointer size

// Windows types:
var WindowsHandle = "Windows::Handle";
var HINSTANCE = WindowsHandle;
var HWND = WindowsHandle;
var SECURITY_ATTRIBUTES = "Windows::SecurityAttributes";
var DWORD = u32;
var LPCWSTR = "const wchar_t*";

// Vulkan function call settings:
var VKAPI_ATTR = "";// used on Android
var VKAPI_CALL = "__stdcall";// calling convention
var VKAPI_PTR = VKAPI_CALL;

typeReplacements.set("char", s8);
typeReplacements.set("uint8_t", s8);
typeReplacements.set("uint32_t", u32);
typeReplacements.set("int32_t", s32);
typeReplacements.set("uint64_t", u64);

typeReplacements.set("HANDLE", WindowsHandle);
typeReplacements.set("HINSTANCE", HINSTANCE);
typeReplacements.set("HWND", HWND);
typeReplacements.set("SECURITY_ATTRIBUTRES", SECURITY_ATTRIBUTES);
typeReplacements.set("DWORD", DWORD);
typeReplacements.set("LPCWSTR", LPCWSTR);

var statusText =				document.getElementById("statusText");
var featureList =				document.getElementById("featureSelection");

var typesDiv =					document.getElementById("types");
var commandTypeDefsDiv =		document.getElementById("commandTypeDefs");
var externPfnDiv =				document.getElementById("externPfns");
var cmdDefsDiv =				document.getElementById("cmdDefs");
var independentCmdLoadingDiv =	document.getElementById("independentCmdLoading");
var instanceCmdLoadingDiv =		document.getElementById("instanceCmdLoading");

//
var parseTextButton =			document.getElementById("parseTextButton");
var localVkXmlBtn =				document.getElementById("localVkXmlBtn");
var headerSelectBtn =			document.getElementById("headerSelectBtn");
var headerCpyBtn =				document.getElementById("copyBtn");
var clearXmlTextBtn =			document.getElementById("clearXmlTextBtn");
var loadRawGithubBtn =			document.getElementById("loadRawGithubBtn");

var vkxmlTextInput = 			document.getElementById("vkxmlText");
var extraIncludesDiv =			document.getElementById("extraIncludes");
var typeIncludeInput =			document.getElementById("typedefInclude");
var surfaceIncludeInput =		document.getElementById("surfaceInclude");
var vulkanNamespaceInput =		document.getElementById("vulkanNamespace");
var implementationDefineInput =	document.getElementById("implementationDefine");

var setupStuff = 				document.getElementById("setupStuff");
var setupPart2 =				document.getElementById("setupPart2");

restoreInput("typedefInclude", typeIncludeInput);
restoreInput("surfaceInclude", surfaceIncludeInput);
restoreInput("vulkanNamespace", vulkanNamespaceInput);
restoreInput("implementationDefine", implementationDefineInput);

var availableFeatures = new Map();
var availableNamed = new Map();

var flags = [];
var earlyPfns = [];
var types = [];
var commands = [];

statusText.textContent = "Ready for action. Load some XML first.";
var xhr = new XMLHttpRequest();
var xmlSource = "";

clearXmlTextBtn.addEventListener("click", clearText);
parseTextButton.addEventListener("click", parseText);
localVkXmlBtn.addEventListener("click", loadLocal);
loadRawGithubBtn.addEventListener("click", loadFromGithub);

var headerSelectBtn = document.getElementById("headerSelectBtn");
var headerCpyBtn = document.getElementById("copyBtn");
headerSelectBtn.addEventListener( "click", selectHeader);
headerCpyBtn.addEventListener("click", copyHeader);

loadLocal();

function restoreInput(localStoreKey, input)
{
	let restored = localStorage.getItem(localStoreKey);
	if (restored)
	{
		input.value = restored;
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
	loadTextXhr("https://raw.githubusercontent.com/KhronosGroup/Vulkan-Docs/1.0/src/spec/vk.xml");
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
	setupPart2.setAttribute("class", "");
	
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
	if (xhr.readyState === 4)
	{
		if (xhr.status === 200)
		{
			if (xhr.responseType == "")
			{
				statusText.textContent = "vk.xml loaded from " + xmlSource + ". If this is the version you want to use, press \"Parse xml\" to continue...";
				vkxmlTextInput.value = xhr.responseText;
			}
			else
			{
				statusText.textContent = "The XHR request did not return a valid XML document.";
			}
		}
		else 
		{
			statusText.textContent = "xhr failed: " + xhr.statusText;
			console.error("xhr failed: " + xhr.statusText);
		}
	}
}

function readXML(vkxml)
{
	featureList.textContent = "";// Clear placeholder text
	
	for (let node of vkxml.childNodes)
	{
		if (!node.nodeType == Node.ELEMENT_NODE) { continue; }
		
		if (node.tagName == "registry") { parseRegistry(node); }
	}
	
	listFeatures();
}

function parseRegistry(xml)
{
	for (let node of xml.childNodes)
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
			default:
				console.warn("unexpected tagName: " + node.tagName);
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
		
		var category = typeNode.getAttribute("category");
		
		let namedThing = {};
		namedThing.category = typeNode.getAttribute("category");
		namedThing.name = typeNode.getAttribute("name");
		namedThing.requires = typeNode.getAttribute("requires");
		if (!namedThing.name)
		{
			let nameTags = typeNode.getElementsByTagName("name");
			if (nameTags.length > 0){	namedThing.name = nameTags.item(0).textContent;	}
		}
		
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
				
				availableNamed.set(namedThing.name, namedThing);
				break;
			}
			case "bitmask":
			case "basetype":
			{
				// Add to list so we can replace each occurance:
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
					availableNamed.set(namedThing.name, namedThing);
				}
				
				break;
			}
			case "struct":
			case "union":
			{
				namedThing.members = [];
				availableNamed.set(namedThing.name, namedThing);
				
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
			default:
			{
				if (!namedThing.category)
				{
					namedThing.category = "EXTERNAL";// capitalized category to avoid collision with future new categories.
				}
				
				if (namedThing.name){	availableNamed.set(namedThing.name, namedThing);	}
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
			constant.type = "u32";
			constant.value = constantNode.getAttribute("value");
			
			if (!constant.value)
			{
				let bitPos = constantNode.getAttribute("bitPos");
				if (!bitPos){	continue;	}
				constant.value = constant.value = "(1 << " + bitPos + ")";
				
			}
			availableNamed.set(constant.name, constant);
			
			constant.type = determineType(constant.value);
		}
	}
	else
	{
		// enums:	
		let cEnum = {};
		cEnum.category = "enum";
		cEnum.name = enumName;
		cEnum.constants = [];
		
		availableNamed.set(cEnum.name, cEnum);
		
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
			constant.value = parseInt(constantNode.getAttribute("value"), 10);
			
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
	command.parameters = [];		

	var protoNode = xml.getElementsByTagName("proto").item(0);
	if (!protoNode){ return;}
	
	command.returnType = protoNode.getElementsByTagName("type").item(0).textContent;
	command.name = protoNode.getElementsByTagName("name").item(0).textContent;
	
	if (command.name == "vkGetDeviceProcAddr" || command.name == "vkGetInstanceProcAddr"){ return; }
	
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
	availableNamed.set(command.name, command);
}

function parseFeature(xml)
{
	var feature = {};

	feature.name = xml.getAttribute("api");
	feature.version = xml.getAttribute("number");
	feature.description = xml.getAttribute("comment");
	feature.availableExtensions = new Map();
	feature.requires = [];
	
	availableFeatures.set(feature.name, feature);
	
	for (let requireOrRemove of xml.childNodes.values())
	{
		if (requireOrRemove.tagName == "remove")
		{ console.error("feature remove tags aren't supported yet. (They weren't used when this generator was written"); }
		else if (requireOrRemove.tagName == "require")
		{
			if (requireOrRemove.getAttribute("profile")		||
				requireOrRemove.getAttribute("extension")	||
				requireOrRemove.getAttribute("api"))
			{
				console.error("When this generator was written, profile, extension and api attributes on require and remove tags weren't used, so they're not currently evaluated in this generator.");
			}
			
			for (const node of requireOrRemove.childNodes.values())
			{
				if (node.nodeType == 1)
				{
					feature.requires.push(node.getAttribute("name"));
				}
			}
		}
	}
	
}

function parseExtension(xml)
{
	var extension = {};
	
	extension.support = xml.getAttribute("supported");
	if (extension.support == "disabled") { return; }
	
	let feature = availableFeatures.get(extension.support);
	if (!feature)
	{
		console.error("extension supports unknown feature: " + extension.support);
		return;
	}
	
	extension.name = xml.getAttribute("name");
	extension.number = parseInt(xml.getAttribute("number"));
	extension.type = xml.getAttribute("type");
	extension.contact = xml.getAttribute("contact");
	extension.protect = xml.getAttribute("protect");
	extension.requires = [];
	
	let requiredExtensions = xml.getAttribute("requires");//TODO: parse for comma separated list of required extensions.
	if (requiredExtensions)
	{
		extension.dependencies = requiredExtensions.split(",");
	}
	
	feature.availableExtensions.set(extension.name, extension);
	
	for (let requireOrRemove of xml.childNodes.values())
	{
		if (requireOrRemove.nodeType != Node.ELEMENT_NODE) { continue; }
		if (requireOrRemove.tagName != "require")
		{
			console.error("Currently only require nodes are supported. Extension name: " + extension.name);
			continue;
		}
		
		for (let symbolNode of requireOrRemove.childNodes.values())
		{
			if (symbolNode.nodeType != Node.ELEMENT_NODE) { continue; }
			
			let require = {};
			require.name = symbolNode.getAttribute("name");
			
			switch(symbolNode.tagName)
			{
				case "enum":
					require.extending = symbolNode.getAttribute("extends");
					if (require.extending)
					{
						require.form = "extensionEnum";
						let constantBitPos = symbolNode.getAttribute("bitpos");
						if (constantBitPos)
						{
							require.value = "(1 << " + constantBitPos + ")";
						}
						else 
						{
							let offsetAttribute = symbolNode.getAttribute("offset");
							if (offsetAttribute)
							{
								let offset = parseInt(offsetAttribute);
								require.value = 1000000000 + offset + (1000 * (extension.number - 1))
								if (symbolNode.getAttribute("dir") == "-")
								{
									require.value = -require.value;
								}
							}
							else if (require.value = symbolNode.getAttribute("value"))
							{
								// special case for VK_SAMPLER_ADDRESS_MODE_MIRROR_CLAMP_TO_EDGE
							}
							else 
							{
								console.error("expected either a bitpos or an offset for: " + require.name);
								continue;
							}
						}
					}
					else 
					{
						require.form = "constant";
						require.value = symbolNode.getAttribute("value");
						if (!require.value)
						{
							let constantBitPos = symbolNode.getAttribute("bitpos");
							if (constantBitPos)
							{
								require.value = "(1 << " + constantBitPos + ")";
							}
							else
							{
								require.form = "reference";
								break;
							}
						}
						else if (require.value.startsWith("VK_"))
						{
							require.form = "enumAlias";
						}
						
						require.type = determineType(require.value);
					}
				break;
				case "type":
				case "command":
					require.form = "reference";
				break;
			}
			
			extension.requires.push(require);
		}
		
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
				return "float";
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
	for (let feature of availableFeatures.values())
	{
		feature.checkbox = addCheckbox(featureList, feature.name, feature.description, feature.name + ", version: " + feature.version);
		if (featureSelectionMap.get(feature.name)){	feature.checkbox.checked = true;	}
		
		var extensionUl = document.createElement("ul");
		extensionUl.setAttribute("class", "autoColumn");
		featureList.appendChild(extensionUl);
		
		for(let extension of feature.availableExtensions.values())
		{
			var extensionLi = document.createElement("li");
			extensionUl.appendChild(extensionLi);
			
			extension.checkbox = addCheckbox(extensionLi, extension.name, extension.name, "Type: " + extension.type + ", Contact: " + extension.contact);
			extension.checkbox.setAttribute("extensionName", extension.name);
			extension.checkbox.setAttribute("featureName", feature.name);
			
			if (extensionSelectionMap.get(extension.name)){	extension.checkbox.checked = true;	}
			
			extension.checkbox.addEventListener("change", checkRequiredExtensions);
		}
		
		let checkAllButton = document.createElement("button");
		checkAllButton.textContent = "Check all";
		checkAllButton.setAttribute("featureName", feature.name);
		checkAllButton.addEventListener("click", checkAllFeatureExtensions);
		
		let uncheckAllButton = document.createElement("button");
		uncheckAllButton.textContent = "Uncheck all";
		uncheckAllButton.setAttribute("featureName", feature.name);
		uncheckAllButton.addEventListener("click", uncheckAllFeatureExtensions);
		
		featureList.appendChild(checkAllButton);
		featureList.appendChild(uncheckAllButton);
	}
	
	let createHeaderButton = document.createElement("button");
	createHeaderButton.textContent = "Create Header";
	createHeaderButton.addEventListener("click", createHeader);
	
	setupStuff.appendChild(createHeaderButton);
	
	statusText.textContent = "Features listing complete. Select features and extensions and press \"Create Header\"...";
}

function checkAllFeatureExtensions()
{
	var feature = availableFeatures.get(this.getAttribute("featureName"));
	
	for(let extension of feature.availableExtensions.values())
	{
		extension.checkbox.checked = true;
	}
}

function uncheckAllFeatureExtensions()
{
	var feature = availableFeatures.get(this.getAttribute("featureName"));
	
	for(let extension of feature.availableExtensions.values())
	{
		extension.checkbox.checked = false;
	}
}

function checkRequiredExtensions()
{
	var feature = availableFeatures.get(this.getAttribute("featureName"));
	var extension = feature.availableExtensions.get(this.getAttribute("extensionName"));
	
	if (extension.checkbox.checked && extension.dependencies)
	{
		for (let dependency of extension.dependencies)
		{
			if (dependency)
			{
				var requiredExtension = feature.availableExtensions.get(dependency.trim());
				if (requiredExtension)
				{
					requiredExtension.checkbox.checked = true;
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

function createHeader()
{
	statusText.textContent = "Applying custom settings:";
	if (typeIncludeInput.value)
	{
		addLineOfCode(extraIncludesDiv, "#include \"" + typeIncludeInput.value + "\"");
	}
	if (surfaceIncludeInput.value)
	{
		addLineOfCode(extraIncludesDiv, "#include \"" + surfaceIncludeInput.value + "\"");
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
	

	// Remember selected features and extensions between sessions:
	let selectedFeatures = "";
	let selectedExtensions = "";
	
	// Sort everything by usage:
	statusText.textContent = "Sorting commands, types and enums...";
	for(let feature of availableFeatures.values())
	{
		if (!feature.checkbox.checked) { continue; }
		selectedFeatures += feature.name + ","
		
		for (let require of feature.requires)
		{
			registerSymbol(require);
		}
		
		registerSymbol("PFN_vkVoidFunction");// We manually implement the only functions that use this, so add it here manually too.
		
		
		for (let extension of feature.availableExtensions.values())
		{
			if (!extension.checkbox.checked) { continue; }
			
			selectedExtensions += extension.name + ",";
			
			// Apply extension changes.
			for (let require of extension.requires)
			{
				switch(require.form)
				{
					case "extensionEnum":
					{
						let cEnum = availableNamed.get(require.extending);
						if (!cEnum)
						{
							console.error("extended enum not found: " + require.extending);
							continue;
						}
						let constant = {};
						constant.name = require.name;
						constant.value = require.value;
						
						cEnum.constants.push(constant);
					}
					break;
					case "constant":
					{
						let constant = {};
						constant.name = require.name
						constant.value = require.value;
						constant.type = require.type
						constant.category = "constant";
					
						availableNamed.set(constant.name, constant);
						registerSymbol(require.name);
					}
					break;
					case "reference":
						registerSymbol(require.name);
					break;
					case "enumAlias":
						// Ignore Enum aliases for now...
					break;
				}
			}
		}
	}
	statusText.textContent = "Saving state for next run...";
	localStorage.setItem("selectedFeatures", selectedFeatures);
	localStorage.setItem("selectedExtensions", selectedExtensions);
	
	localStorage.setItem("typedefInclude", typeIncludeInput.value);
	localStorage.setItem("surfaceInclude", surfaceIncludeInput.value);
	localStorage.setItem("vulkanNamespace", vulkanNamespaceInput.value);
	localStorage.setItem("implementationDefine", implementationDefineInput.value);
	
	
	// Replace types and changes names:
	statusText.textContent = "Replacing type names...";
	
	for(let i = 0; i < flags.length; ++i)
	{
		let flag = flags[i];
		typeReplacements.set(flag.name, u32);
	}
	for (let i = 0; i < types.length; ++i)
	{
		let type = types[i];
		switch(type.category)
		{
			case "struct":
			case "union":
				type.originalName = type.name;
				type.name = stripVk(type.name);
				
				for (let j = 0; j < type.members.length; ++j)
				{
					let member = type.members[j];
					member.type = typeReplacement(member.type);
					
					if (member.cEnum)
					{
						member.cEnum = typeReplacement(member.cEnum);
					}
				}
				
				typeReplacements.set(type.originalName, type.name);
			break;
			case "funcpointer":
				type.originalName = type.name;
				type.name = stripVk(stripPFN(type.name));
				type.preName = type.preName.replace(/\bVkBool32\b/, ub32);// manual replacement, since the xml lacks return type markup.
				type.preName = type.preName.replace(/\bVKAPI_PTR\b/, VKAPI_PTR);
				
				
				for (let j = 0; j < type.parameters.length; ++j)
				{
					let parameter = type.parameters[j];
					parameter.type = typeReplacement(parameter.type);
				}
				
				typeReplacements.set(type.originalName, "PFN::" + type.name);
			break;
			case "basetype":
				type.originalName = type.name;
				type.name = stripVk(type.name);
				
				type.type = typeReplacement(type.type);
				
				typeReplacements.set(type.originalName, type.name);
			break;
			case "constant":
			{
				type.originalName = type.name;
				type.name = stripVk(type.name);
				typeReplacements.set(type.originalName, type.name);
				
				// enum alias renaming:
				type.value = typeReplacement(type.value);
			}
			break;
			case "enum":
			{
				type.originalName = type.name;
				type.name = stripVk(type.name);
				
				for (let j = 0; j < type.constants.length; ++j)
				{
					let constant = type.constants[j];
					constant.originalName = constant.name;
					constant.name = stripEnumName(constant.name, type.originalName);
					typeReplacements.set(constant.originalName, type.name + "::" + constant.name);
				}
				if (!type.isBitMask)
				{
					type.minName = stripEnumName(type.minName, type.originalName);
					type.maxName = stripEnumName(type.maxName, type.originalName);
				}
				
				typeReplacements.set(type.originalName, type.name);
			}
			break;
			case "handle":
			{
				type.originalName = type.name;
				type.name = stripVk(type.name);
				typeReplacements.set(type.originalName, type.name);
			}
			break;
		}
	}
	for (let i = 0; i < commands.length; ++i)
	{
		let command = commands[i];
		command.originalName = command.name;
		command.name = stripVk(command.name);
		
		command.returnType = typeReplacement(command.returnType);
		
		for (let j = 0; j < command.parameters.length; ++j)
		{
			let parameter = command.parameters[j];
			parameter.type = typeReplacement(parameter.type);
		}
	}	
	
	// Write header:
	statusText.textContent = "Writing Header...";
	setupStuff.setAttribute("class", "hidden");
	document.getElementById("hiddenUntilCreation").removeAttribute("class");
	document.getElementById("vkGetInstanceProcAddrDefine").textContent = vulkanNamespace + "::PFN::VoidFunction " + VKAPI_CALL + " vkGetInstanceProcAddr( " + vulkanNamespace + "::Instance instance, const " + s8 + "* pName );";
	
	let lastCategory = "";
	for (let i = 0; i < types.length; ++i)
	{
		let type = types[i];
		switch(type.category)
		{
			case "struct":
			case "union":
				addLineOfCode(typesDiv, indentation(1));
				addLineOfCode(typesDiv, indentation(1) + type.category + " " + type.name + " {");
				for (let j = 0; j < type.members.length; ++j)
				{
					let member = type.members[j];
					addLineOfCode(typesDiv, padTabs(indentation(2) + member.preType + member.type + member.postType, 89) + member.name + member.preEnum + member.cEnum + member.postEnum + ";");
				}
				addLineOfCode(typesDiv, indentation(1) + "};");
			break;
			case "funcpointer":
				addLineOfCode(typesDiv, indentation(1));
				
				if (lastCategory != type.category)
				{
					addLineOfCode(typesDiv, indentation(1) + "namespace PFN {");
				}
				
				addLineOfCode(typesDiv, indentation(2) + type.preName + type.name + type.postName.trim());
				
				for(let j= 0; j < type.parameters.length; ++j)
				{
					let parameter = type.parameters[j];
					addLineOfCode(typesDiv, padTabs(indentation(3) + parameter.preType + parameter.type + parameter.postType, 86) + parameter.name);
				}
				
				let nextIndex = i + 1;
				if (nextIndex < types.length && types[nextIndex].category != type.category)
				{
					addLineOfCode(typesDiv, indentation(1) + "}");
				}
			break;
			case "basetype":
				addLineOfCode(typesDiv, indentation(1));
				addLineOfCode(typesDiv, padTabs(indentation(1) + "typedef " + type.type, 92) + type.name + ";");
			break;
			case "constant":
			{
				if (lastCategory != type.category && lastCategory != "")
				{
					addLineOfCode(typesDiv, indentation(1));
				}
				
				let postName = "";
				if (type.type == "string")
				{
					type.type = s8;
					postName = "[]";
				}
				addLineOfCode(typesDiv, padTabs(padTabs(indentation(1) + "const " + type.type, 16) + type.name + postName + " = ", 90) + type.value + ";");
			}
			break;
			case "enum":
			{
				let enumDiv = document.createElement("div");
				enumDiv.setAttribute("id", type.name);
				typesDiv.appendChild(enumDiv);
				
				addLineOfCode( enumDiv, indentation(1));
				addLineOfCode(enumDiv, indentation(1) + "enum class " + type.name);
				addLineOfCode(enumDiv, indentation(1) + "{");
				
				for( let j = 0; j < type.constants.length; ++j)
				{
					let constant = type.constants[j];
					addLineOfCode(enumDiv,  padTabs(indentation(2) + constant.name + " =", 89) + constant.value + ",");
				}
				
				if (!type.isBitMask)
				{
					addLineOfCode( enumDiv, padTabs(indentation(2) + "BEGIN_RANGE =", 89) + type.minName + ",");
					addLineOfCode( enumDiv, padTabs(indentation(2) + "END_RANGE =", 89) + type.maxName + ",");
					addLineOfCode( enumDiv, padTabs(indentation(2) + "RANGE_SIZE =", 89) + "(" + type.maxName + " - " + type.minName + " + 1),");
				}
				
				addLineOfCode( enumDiv, padTabs(indentation(2) + "MAX_ENUM =", 89) + max_enum);
					
				addLineOfCode( enumDiv, indentation(1) + "};");
			}
			break;
			case "handle":
			{
				if (lastCategory != type.category && lastCategory != "")
				{
					addLineOfCode(typesDiv, indentation(1));
				}
				let handleName = type.name;
				addLineOfCode(typesDiv, padTabs(indentation(1) + "typedef struct " + handleName + "_Handle*", 92) + handleName + ";");
			}
			break;
		}
		
		lastCategory = type.category;
	}
	
	// Write out commands:
	for(let i = 0; i < commands.length; ++i)
	{
		let command = commands[i];
	
		let parametersText = "";
		for(let j=0;j < command.parameters.length; ++j)
		{
			if (j > 0) { parametersText += ","; }
			let parameter = command.parameters[j];
			parametersText += "\n" + indentation(11) + parameter.preType + parameter.type + parameter.postType + parameter.name;
		}
		
		addLineOfCode( commandTypeDefsDiv, padTabs(indentation(2) + "typedef " + command.returnType, 24) + "(" + VKAPI_PTR + " *" + command.name + ")(" + parametersText + ");" );
		addLineOfCode( commandTypeDefsDiv, indentation(2));
		
		// Function defintions:
		addLineOfCode(externPfnDiv, padTabs(indentation(1) + "extern PFN::" + command.name, 68) + command.name + ";");
		addLineOfCode(cmdDefsDiv,	padTabs(indentation(1) + "PFN::" + command.name, 68) + command.name + ";");
		
		if (command.originalName == "vkEnumerateInstanceLayerProperties" || command.originalName == "vkEnumerateInstanceExtensionProperties" || command.originalName == "vkCreateInstance")
		{
			addLineOfCode(independentCmdLoadingDiv, indentation(3) + vulkanNamespace + '::' + command.name + ' = (' + vulkanNamespace + '::PFN::' + command.name + ') vkGetInstanceProcAddr( nullptr, "' + command.originalName + '" );');
			addLineOfCode(independentCmdLoadingDiv, indentation(3) + 'if(!' + vulkanNamespace + '::' + command.name + ') { return false; }');
		}
		else 
		{
			addLineOfCode(instanceCmdLoadingDiv, indentation(3) + vulkanNamespace + '::' + command.name + ' = (' + vulkanNamespace + '::PFN::' + command.name + ') vkGetInstanceProcAddr( instance, "' + command.originalName + '" );');
			addLineOfCode(instanceCmdLoadingDiv, indentation(3) + 'if(!' + vulkanNamespace + '::' + command.name + ') { return false; }');
		}
	}
	statusText.textContent = "Header completed writing.";
}

function typeReplacement(original)
{
	let replacement = typeReplacements.get(original);
	if (replacement){	return replacement;	}
	else{	return original;	}
}

function registerSymbol(symbolName)
{
	if (symbolName == "vkGetDeviceProcAddr" || symbolName == "vkGetInstanceProcAddr"){ return; }
	
	let found = availableNamed.get(symbolName);
	if (found)
	{
		if (found.requires){
			registerSymbol(found.requires);
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
				pushIfNew(types, found);
			break;
			case "command":
				registerSymbol(found.returnType);
				for (let i = 0; i < found.parameters.length; ++i)
				{
					registerSymbol(found.parameters[i].type);
				}
				pushIfNew(commands, found);
			break;
			case "funcpointer":
				// registerSymbol(found.type);
				for (let i = 0; i < found.parameters.length; ++i)
				{
					registerSymbol(found.parameters[i].type);
				}
				pushIfNew(types, found);
			break;
			case "bitmask":
				pushIfNew(flags, found);
			break;
			case "enum":
			case "handle":
			case "constant":
			case "basetype":
				pushIfNew(types, found);
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

function selectHeader()
{
	var sel = window.getSelection();
	var range = document.createRange();
	range.selectNodeContents(vulkanHeader);
	sel.removeAllRanges();
	sel.addRange(range);
}

function copyHeader()
{
	selectHeader();
	try
	{
		document.execCommand("copy");
		statusText.textContent = "Header copied";
	}
	catch(err)
	{
		console.error("copy is not supported in this browser");
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

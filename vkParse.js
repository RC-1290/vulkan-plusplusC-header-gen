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

typeReplacements.set("VkSampleMask", u32);
typeReplacements.set("VkBool32", ub32);
typeReplacements.set("VkDeviceSize", DeviceSize);

typeReplacements.set("HANDLE", WindowsHandle);
typeReplacements.set("HINSTANCE", HINSTANCE);
typeReplacements.set("HWND", HWND);
typeReplacements.set("SECURITY_ATTRIBUTRES", SECURITY_ATTRIBUTES);
typeReplacements.set("DWORD", DWORD);
typeReplacements.set("LPCWSTR", LPCWSTR);


// Startup code:
var statusText =				document.getElementById("statusText");
var featureList =				document.getElementById("featureSelection");
var symbolList =				document.getElementById("symbols");

var handlesDiv =				document.getElementById("handles");
var enumsDiv =					document.getElementById("enums");
var structsDiv =				document.getElementById("structs");
var commandTypeDefsDiv =		document.getElementById("commandTypeDefs");
var externPfnDiv =				document.getElementById("externPfns");
var cmdDefsDiv =				document.getElementById("cmdDefs");
var independentCmdLoadingDiv =	document.getElementById("independentCmdLoading");
var instanceCmdLoadingDiv =		document.getElementById("instanceCmdLoading");

var availableFeatures = new Map();

var availableNamed = new Map();

var flags = [];
var handles = [];
var constants = [];
var enums = [];
var earlyPfns = [];
var structs = [];
var commands = [];


statusText.textContent = "Trying to open vk.xml";

var xhr = new XMLHttpRequest();
var async = true;
xhr.addEventListener("load", onXhrLoad);
xhr.open("GET", "vk.xml", async);
xhr.send();

var headerSelectBtn = document.getElementById("headerSelectBtn");
headerSelectBtn.addEventListener( "click", selectHeader);

function onXhrLoad()
{
	if (xhr.readyState === 4)
	{
		if (xhr.status === 200)
		{
			statusText.textContent = "reading xml...";
			readXML(xhr.responseXML);	
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
	// Clear placeholder text:
	featureList.textContent = "";
	
	// Parse Types and Enums:	
	var typesNode = vkxml.getElementsByTagName("types").item(0);
	var typeNodes = typesNode.children;
	for(let i = 0; i < typeNodes.length; ++i)
	{
		var typeNode = typeNodes.item(i);
		var category = typeNode.getAttribute("category");
		
		let namedThing = {};
		namedThing.category = typeNode.getAttribute("category");
		namedThing.name = typeNode.getAttribute("name");
		if (!namedThing.name)
		{
			let nameTags = typeNode.getElementsByTagName("name");
			if (nameTags.length > 0){	namedThing.name = nameTags.item(0).textContent;	}
		}
		
		if (namedThing.category == "funcpointer")
		{		
			namedThing.parameters = [];
			namedThing.preName = "";
			namedThing.postName = "";
			
			let currentParameter;
			let nameFound = false;
			let nameComplete = false;
			
			let childNodes = typeNode.childNodes;
			
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
						currentParameter.postType = "";
						namedThing.parameters.push(currentParameter);
						currentParameter.type = nodeText;
					}
					else
					{
						currentParameter.postType += nodeText.trim();
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
		}
		else if (namedThing.category == "bitmask")
		{
			// Add to list so we can replace each occurance:
			var typeChildNodes = typeNode.childNodes;
			for (var j = 0; j < typeChildNodes.length; ++j)
			{
				var typeChildNode = typeChildNodes.item(j);
				if (typeChildNode.tagName == "name")
				{
					let flag = {};
					flag.category = category;
					flag.name = typeChildNode.textContent;
					availableNamed.set(flag.name, flag);
					break;
				}
			}			
		}
		else if (namedThing.category == "struct" || namedThing.category == "union")
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
						case 1:// Element
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
						case 3:// Text Node
							let contents = memberTag.textContent;
							
							if (!member.type){	member.preType += contents;	}//e.g.: void
							else if (!member.name)	{ member.postType += contents; }// e.g.: *
							else if (!member.cEnum)	{ member.preEnum += memberTag.textContent.trim(); }//e.g.: [ in [someArray]
							else					{ member.postEnum += memberTag.textContent.trim(); }//e.g.: ] in [someArray]
						break;
					}
				}
				
			}
		}
		else 
		{
			
			if (!namedThing.category)
			{
				if (typeNode.getAttribute("requires"))
				{
					namedThing.category = "EXTERNAL";// capitalized category to avoid collision with future new categories.
				}
			}
			
			if (namedThing.name){	availableNamed.set(namedThing.name, namedThing);	}
		}
		
	}
	
	// constants:
	let enumsNodes = vkxml.getElementsByTagName("enums");
	for(let i = 0; i < enumsNodes.length; ++i)
	{
		var enumsNode = enumsNodes.item(i);
		var enumName = enumsNode.getAttribute("name");
		if (enumName == "API Constants")
		{
			var constants = enumsNode.children;
			for(let j = 0; j < constants.length; ++j)
			{
				var constantNode = constants.item(j);
				
				var constant = {};
				
				constant.category = "constant";
				constant.name = constantNode.getAttribute("name");
				constant.value = constantNode.getAttribute("value");
				constant.type = "u32";
				
				let typeFound = false;
				
				if (!constant.value){ continue; }
				availableNamed.set(constant.name, constant);
				
				if (constant.value.startsWith("VK_"))
				{
					// Probably an enum alias, skip it:
					continue;
				}
				
				// naive type analysis that only recognizes ULL (unsigned 64), f (float) or " (char* / c-string)
				for(let k = 0; k < constant.value.length; ++k)
				{					
					switch(constant.value[k])
					{
						case 'U':
							if (k > 0 && !isNaN(constant.value[k-1]) && constant.value[k+1] == "L" && constant.value[k+2] == "L")
							{
								constant.type = u64;
								typeFound = true;
								break;
							}
						break;
						case 'f':
							constant.type = "float";
							typeFound = true;
						break;
						case '"':
							constant.type = s8 + "*";
							typeFound = true;
						break;
					}
					if (typeFound) { break; }
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
			
			availableNamed.set(cEnum.name, cEnum);
			
			let enumType = enumsNode.getAttribute("type");
			cEnum.isBitMask = enumType == "bitmask";
			
			cEnum.minName = "";
			let minValue = 0;
			cEnum.maxName = cEnum.minName;
			let maxValue = minValue;
			
			let enumEntry = enumsNode.children;
			for(let j = 0; j < enumEntry.length; ++j)
			{
				let constantNode = enumEntry.item(j);
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
	
	// Parse commands
	var commandsNode = vkxml.getElementsByTagName("commands").item(0);
	var commandElements = commandsNode.getElementsByTagName("command");
	for(let i = 0; i < commandElements.length; ++i)
	{
		let command = {};
		command.category = "command";
		command.parameters = [];		
		
		var commandNode = commandElements.item(i);
		if (!commandNode){ break;}
		var protoNode = commandNode.getElementsByTagName("proto").item(0);
		if (!protoNode){ break;}
		
		command.returnType = protoNode.getElementsByTagName("type").item(0).textContent;
		command.name = protoNode.getElementsByTagName("name").item(0).textContent;
		
		if (command.name == "vkGetDeviceProcAddr" || command.name == "vkGetInstanceProcAddr"){ continue; }
		
		var commandChildren = commandNode.children;
		
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
	
	// List features:
	statusText.textContent = "Listing Features...";
	var featureNodes = vkxml.getElementsByTagName("feature");
	for(let i = 0; i < featureNodes.length; ++i)
	{
		var feature = {};

		feature.node = featureNodes.item(i);
		feature.name = feature.node.getAttribute("api");
		feature.version = feature.node.getAttribute("number");
		feature.description = feature.node.getAttribute("comment");

		availableFeatures.set(feature.name, feature);
		
		feature.checkbox = addCheckbox(featureList, feature.name, feature.description, feature.name + ", version: " + feature.version);
		var extensionUl = document.createElement("ul");
		extensionUl.setAttribute("class", "extensionList");
		featureList.appendChild(extensionUl);

		feature.availableExtensions = new Map();

		// Extensions:
		var extensionsNode = vkxml.getElementsByTagName("extensions").item(0);
		var extensionNodes = extensionsNode.children;
		for(let j = 0; j < extensionNodes.length; ++j)
		{
			var extension = {};

			extension.node = extensionNodes.item(j);
			
			extension.support = extension.node.getAttribute("supported");
			if (extension.support == "disabled" || extension.support != feature.name) { continue; }

			
			extension.name = extension.node.getAttribute("name");
			extension.number = parseInt(extension.node.getAttribute("number"));
			extension.type = extension.node.getAttribute("type");
			extension.requires = extension.node.getAttribute("requires");
			extension.contact = extension.node.getAttribute("contact");
			
			var extensionLi = document.createElement("li");
			extensionUl.appendChild(extensionLi);

			feature.availableExtensions.set(extension.name, extension);
			
			extension.checkbox = addCheckbox(extensionLi, extension.name, extension.name, "Type: " + extension.type + ", Contact: " + extension.contact);
			extension.checkbox.setAttribute("extensionName", extension.name);
			extension.checkbox.setAttribute("featureName", feature.name);
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
	
	let writeHeaderButton = document.createElement("button");
	writeHeaderButton.textContent = "Create Header";
	writeHeaderButton.addEventListener("click", writeHeader);
	
	featureList.appendChild(writeHeaderButton);
	
	statusText.textContent = "Features listed, waiting for user input...";
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
	
	if (extension.checkbox.checked)
	{
		var requiredExtension = feature.availableExtensions.get(extension.requires);
		if (requiredExtension)
		{
			requiredExtension.checkbox.checked = true;
		}
	}
}

function writeHeader()
{
	// Sort everything by usage:
	statusText.textContent = "Sorting commands, types and enums...";
	for(let feature of availableFeatures.values())
	{
		if (!feature.checkbox.checked) { continue; }
		
		for (let requireOrRemove of feature.node.childNodes.values())
		{
			if (requireOrRemove.tagName == "remove")
			{ console.error("feature remove tags aren't supported yet. (They weren't used when this generator was written"); }
			else if (requireOrRemove.tagName == "require")
			{
				for (const node of requireOrRemove.childNodes.values())
				{
					if (node.nodeType == 1)
					{
						registerSymbol(node.getAttribute("name"));
					}
				}
			}
		}
		
		registerSymbol("PFN_vkVoidFunction");// We manually implement the only functions that use this, so add it here manually too.
		
		/*
		for (let extension of feature.availableExtensions.values())
		{
			if (!extension.checkbox.checked) { continue; }
			
			// Apply extension changes.
			// NOTE: this assumes there's only one feature. If there are multiple, they'll all be affected.
			var extensionChildren = extension.node.children;
			for(var k = 0; k < extensionChildren.length; ++k)
			{
				var requireOrRemove = extensionChildren.item(k);
				var interfaces = requireOrRemove.childNodes;
				if (requireOrRemove.tagName == "require")
				{
					for(var l = 0; l < interfaces.length; ++l)
					{
						var interfaceNode = interfaces.item(l);
						var tagName = interfaceNode.tagName;
						
						if (tagName == "enum")
						{
							var enumName = interfaceNode.getAttribute("name");
							addLineOfCode(symbolList, "enum: " + enumName);
							
							var extending = interfaceNode.getAttribute("extends");
							if (extending)
							{
								// Find appropriate enum and add it:
								for(var m = 0; m < enumsNodes.length; ++m)
								{
									var enumsNode = enumsNodes.item(m);
									if (enumsNode.getAttribute("name") == extending)
									{
										var offsetAttribute = interfaceNode.getAttribute("offset");
										if (offsetAttribute)
										{
											var offset = parseInt(interfaceNode.getAttribute("offset"));
											var valueAttribute = 1000000000 + offset + (1000 * (extension.number - 1))
											if (interfaceNode.getAttribute("dir") == "-")
											{
												valueAttribute = -valueAttribute;
											}
											
											interfaceNode.setAttribute("value", valueAttribute);
										}
										interfaceNode.setAttribute("extends", extending);
										enumsNode.appendChild(interfaceNode);
									}
								}
								
							}
							else 
							{
								apiConstantsNode.appendChild(interfaceNode);
							}							
						}
						else if (tagName == "command")
						{
							
						}
						else if (tagName == "type")
						{
							
						}
					}
				}
				else 
				{
					console.error("extension remove tags aren't supported yet. (They weren't used when this generator was written");
				}
				
			}
		}*/
		
		
	}
	
	// Replace types and changes names:
	for(let i = 0; i < flags.length; ++i)
	{
		let flag = flags[i];
		typeReplacements.set(flag.name, u32);
	}
	
	for (let i = 0; i < handles.length; ++i)
	{
		let handle = handles[i];
		handle.originalName = handle.name;
		handle.name = stripVk(handle.name);
		typeReplacements.set(handle.originalName, handle.name);
	}
	for (let i = 0; i < constants.length; ++i)
	{
		let constant = constants[i];
		constant.originalName = constant.name;
		constant.name = stripVk(constant.name);
		typeReplacements.set(constant.originalName, constant.name);
	}
	for (let i = 0; i < enums.length; ++i)
	{
		let cEnum = enums[i];
		cEnum.originalName = cEnum.name;
		cEnum.name = stripVk(cEnum.name);
		
		for (let j = 0; j < cEnum.constants.length; ++j)
		{
			let constant = cEnum.constants[j];
			constant.originalName = constant.name;
			constant.name = stripEnumName(constant.name, cEnum.originalName);
			typeReplacements.set(constant.originalName, cEnum.name + "::" + constant.name);
		}
		if (!cEnum.isBitMask)
		{
			cEnum.minName = stripEnumName(cEnum.minName, cEnum.originalName);
			cEnum.maxName = stripEnumName(cEnum.maxName, cEnum.originalName);
		}
		
		typeReplacements.set(cEnum.originalName, cEnum.name);
	}
	for (let i = 0; i < structs.length; ++i)
	{
		let type = structs[i];
		switch(type.category)
		{
			case "struct":
			case "union":
				type.originalName = type.name;
				type.name = stripVk(type.name);
				
				for (let j = 0; j < type.members.length; ++j)
				{
					let member = type.members[j];
					let replacement = typeReplacements.get(member.type);
					if (replacement){	member.type = replacement;	}
					
					if (member.cEnum)
					{
						let replacement = typeReplacements.get(member.cEnum);
						if (replacement) { member.cEnum = replacement; }
					}
				}
				
				typeReplacements.set(type.originalName, type.name);
			break;
			case "funcpointer":
				type.originalName = type.name;
				type.preName = type.preName.replace(/\bVKAPI_PTR\b/, VKAPI_PTR);
				for (let j = 0; j < type.parameters.length; ++j)
				{
					let parameter = type.parameters[j];
					let replacement = typeReplacements.get(parameter.type);
					if (replacement){	parameter.type = replacement;	}
				}
				
				typeReplacements.set(type.originalName, type.name);
			break;
		}
	}
	for (let i = 0; i < commands.length; ++i)
	{
		let command = commands[i];
		command.originalName = command.name;
		command.name = stripVk(command.name);
		
		let replacement = typeReplacements.get(command.returnType);
		if (replacement){	command.returnType = replacement;	}
		
		for (let j = 0; j < command.parameters.length; ++j)
		{
			let parameter = command.parameters[j];
			let replacement = typeReplacements.get(parameter.type);
			if (replacement){	parameter.type = replacement;	}
		}
	}	
	
	// Write header:
	statusText.textContent = "Writing Header...";
	document.getElementById("setupStuff").setAttribute("class", "hidden");
	document.getElementById("hiddenUntilCreation").removeAttribute("class");
	document.getElementById("vkGetInstanceProcAddrDefine").textContent = vulkanNamespace + "::PFN_vkVoidFunction " + VKAPI_CALL + " vkGetInstanceProcAddr( " + vulkanNamespace + "::Instance instance, const " + s8 + "* pName );";
	
	// Write Handles:
	for(let i = 0; i < handles.length; ++i)
	{
		let handleName = handles[i].name;
		addLineOfCode(handlesDiv, padTabs(indentation(1) + "typedef struct " + handleName + "_Handle*", 60) + handleName + ";");
	}
	
	// Write constants:
	for(let i = 0; i < constants.length; ++i)
	{
		let constant = constants[i];
		addLineOfCode(enumsDiv, padTabs(indentation(1) + "const " + constant.type, 17) + constant.name + " = " + constant.value + ";");
	}
	
	// Write enums:
	addLineOfCode(enumsDiv, indentation(1));
	for(let i = 0; i < enums.length; ++i)
	{		
		let cEnum = enums[i];
		let enumDiv = document.createElement("div");
		enumDiv.setAttribute("id", cEnum.name);
		enumsDiv.appendChild(enumDiv);
		
		addLineOfCode(enumDiv, indentation(1) + "enum class " + cEnum.name);
		addLineOfCode(enumDiv, indentation(1) + "{");
		
		for( let j = 0; j < cEnum.constants.length; ++j)
		{
			let constant = cEnum.constants[j];
			addLineOfCode(enumDiv,  padTabs(indentation(2) + constant.name + " =", 89) + constant.value + ",");
		}
		
		if (!cEnum.isBitMask)
		{
			addLineOfCode( enumDiv, padTabs(indentation(2) + "BEGIN_RANGE =", 89) + cEnum.minName + ",");
			addLineOfCode( enumDiv, padTabs(indentation(2) + "END_RANGE =", 89) + cEnum.maxName + ",");
			addLineOfCode( enumDiv, padTabs(indentation(2) + "RANGE_SIZE =", 89) + "(" + cEnum.maxName + " - " + cEnum.minName + " + 1),");
		}
		
		addLineOfCode( enumDiv, padTabs(indentation(2) + "MAX_ENUM =", 89) + max_enum);
			
		addLineOfCode( enumDiv, indentation(1) + "};");
		addLineOfCode( enumDiv, indentation(1));
	}
	
	// Write out structs:
	for (let i = 0; i < structs.length; ++i)
	{
		let type = structs[i];
		switch(type.category)
		{
			case "struct":
			case "union":
				
				addLineOfCode(structsDiv, indentation(1) + "struct " + type.name + " {");
				for (let j = 0; j < type.members.length; ++j)
				{
					let member = type.members[j];
					addLineOfCode(structsDiv, padTabs(indentation(2) + member.preType + member.type + member.postType, 57) + member.name + member.preEnum + member.cEnum + member.postEnum + ";");
				}
				addLineOfCode(structsDiv, indentation(1) + "};");
				addLineOfCode(structsDiv, indentation(1));
			break;
			case "funcpointer":
				addLineOfCode(structsDiv, indentation(1) + type.preName + type.name + type.postName.trim());
				
				for(let j= 0; j < type.parameters.length; ++j)
				{
					let parameter = type.parameters[j];
					addLineOfCode(structsDiv, padTabs(indentation(2) + parameter.type + parameter.postType,57) + parameter.name);
				}
				addLineOfCode(structsDiv, indentation(1));
			break;
		}
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
		addLineOfCode(cmdDefsDiv,	padTabs(indentation(1) + " PFN::" + command.name, 68) + command.name + ";");
		
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

function registerSymbol(symbolName)
{
	if (symbolName == "vkGetDeviceProcAddr" || symbolName == "vkGetInstanceProcAddr"){ return; }
	
	let found = availableNamed.get(symbolName);
	if (found)
	{
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
				pushIfNew(structs, found);
			break;
			case "command":
				registerSymbol(found.returnType);
				for (let i = 0; i < found.parameters.length; ++i)
				{
					registerSymbol(found.parameters[i].type);
				}
				pushIfNew(commands, found);
			break;
			case "handle":
				pushIfNew(handles, found);
			break;
			case "funcpointer":
				// registerSymbol(found.type);
				for (let i = 0; i < found.parameters.length; ++i)
				{
					registerSymbol(found.parameters[i].type);
				}
				pushIfNew(structs, found);
			break;
			case "enum":
				pushIfNew(enums, found);
			break;
			case "constant":
				pushIfNew(constants, found);
			break;
			case "bitmask":
				pushIfNew(flags, found);
			break;
			case "include":
			case "define":
			case "basetype":
			case "EXTERNAL":
				// ignored...
			break;
			default:
				console.error("Unknown type category: '"  + found.category + "', on found: '" + found.name + "' of type: " + found.type);
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
	var nameIndex = 0;
	var entryIndex = 0;
	for(entryIndex = 0; entryIndex < entryName.length; ++entryIndex)
	{
		if (entryName[entryIndex] == "_")
		{
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
	
	if (!isNaN(entryName.charAt(entryIndex)))
	{
		--entryIndex;
	}
	
	return entryName.slice(entryIndex);
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

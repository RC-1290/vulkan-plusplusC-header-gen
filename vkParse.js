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


// Replacement Types:
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

// 
var max_enum = "0x7FFFFFFF";

// Formatting settings:
var tab = "	";
var tabSpaceWidth = 4;// If you change this, you might want to change the css too.


// Startup code:
var statusText =				document.getElementById("statusText");
var featureList =				document.getElementById("featureSelection");
var symbolList =				document.getElementById("symbols");

var handlesDiv =				document.getElementById("handles");
var enumsDiv =					document.getElementById("enums");
var earlyPfnDiv =				document.getElementById("earlyPfn");
var structsDiv =				document.getElementById("structs");
var commandTypeDefsDiv =		document.getElementById("commandTypeDefs");
var externPfnDiv =				document.getElementById("externPfns");
var cmdDefsDiv =				document.getElementById("cmdDefs");
var independentCmdLoadingDiv =	document.getElementById("independentCmdLoading");
var instanceCmdLoadingDiv =		document.getElementById("instanceCmdLoading");

var xhr = new XMLHttpRequest();
var vkxml;
var features = new Map();

var availableCommands = new Map();
var availableEnums = new Map();
var availableTypes = new Map();
var availableFlags = new Map();

var commands = [];
var structs = [];
var earlyPfns = [];
var handles = [];
var constants = [];
var enums = [];

statusText.textContent = "Trying to open vk.xml";

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
			statusText.textContent = "parsing xml...";
			listFeaturesAndExtensions();	
		}
		else 
		{
			statusText.textContent = "xhr failed: " + xhr.statusText;
			console.error("xhr failed: " + xhr.statusText);
		}
	}
}

function listFeaturesAndExtensions()
{
	vkxml = xhr.responseXML;
	
	// Clear placeholder text:
	featureList.textContent = "";
	
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

		features.set(feature.name, feature);
		
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
	
	// example handles:
	handles.push("exampleHandle");
	
	// example enums:
	var constant = {};
	constant.type = "u32";
	constant.name = "TEST_CONSTANT";
	constant.value = 256;
	constants.push(constant);
	
	let cEnum = {};
	cEnum.name = "ExampleEnum";
	cEnum.isBitMask = false;
	cEnum.minName = "EXAMPLE_MIN";
	cEnum.maxName = "EXAMPLE_MAX";
	cEnum.constants = [];
	let minConstant = {};
	minConstant.name = "EXAMPLE_MIN";
	minConstant.value = 0;
	let maxConstant = {};
	maxConstant.name = "EXAMPLE_MAX";
	maxConstant.value = 1;
	cEnum.constants.push(minConstant);
	cEnum.constants.push(maxConstant);
	enums.push(cEnum);
	
	// example early function pointers:
	var earlyPfn = {};
	earlyPfn.code = "typedef void* (VKAPI_PTR *PFN_vkAllocationFunction)(\n    void*                                       pUserData, \n    size_t                                      size,\n    size_t                                      alignment,\n    VkSystemAllocationScope                     allocationScope);";
	earlyPfns.push(earlyPfn);
	
	// example struct:
	var struct = {};
	var member = {};
	
	struct.name = "someStruct";
	struct.members = [];
	
	member.name = "sampler";
	member.type = "Sampler";
	
	struct.members.push(member);
	structs.push(struct);
		
		
	// example command:
	var command = {};
	command.name = "something";
	command.originalName = "vkSomething";
	command.returnType = "void";
	command.parameters = [];
	
	let parameter = {};
	parameter.preType = "";
	parameter.type = "void";
	parameter.postType = "*";
	parameter.name = "example";
	
	command.parameters.push(parameter);
	commands.push(command);
	
	statusText.textContent = "Features listed, waiting for user input...";
}

function checkAllFeatureExtensions()
{
	var feature = features.get(this.getAttribute("featureName"));
	
	for(let extension of feature.availableExtensions.values())
	{
		extension.checkbox.checked = true;
	}
}

function uncheckAllFeatureExtensions()
{
	var feature = features.get(this.getAttribute("featureName"));
	
	for(let extension of feature.availableExtensions.values())
	{
		extension.checkbox.checked = false;
	}
}

function checkRequiredExtensions()
{
	var feature = features.get(this.getAttribute("featureName"));
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
	statusText.textContent = "Putting required commands types and enums in order...";
	for(let feature of features.values())
	{
		if (!feature.checkbox.checked) { continue; }
		
		for (let requireOrRemove of feature.node.childNodes.values())
		{
			if (requireOrRemove.tagName == "remove")
			{ console.error("feature remove tags aren't supported yet. (They weren't used when this generator was written"); }
			else if (requireOrRemove.tagName == "require")
			{
				for (const tag of requireOrRemove.childNodes.values())
				{
					if (tag.tagName == "command")
					{
						let commandName = tag.getAttribute("name");
						found = availableCommands.get(commandName);
						if (found)
						{
							for (let i = 0; i < found.parameters.length; ++i)
							{
								addType(found.parameters.type);
							}
							pushIfNew(commands, found);
						}
						else { console.error("command not found: " + commandName); }
					}
					else if (tag.tagName == "enum")
					{
						let enumName = tag.getAttribute("name");
						let found = availableEnums.get(enumName);
						if (found)
						{
							switch(found.category)
							{
								case "enum":
									pushIfNew(enums, found);
								break;
								case "constant":
									pushIfNew(constants, found);
								break;
								case "funcPointer":
									pushIfNew(earlyPfns, found);
								break;
								default:
									console.error("unknown enum category: " + found.category);
								break;
							}
						}
						else {	console.error("enum not found: " + enumName);	}
					}
					else if (tag.tagName == "type")
					{
						addType(tag.getAttribute("name"));						
					}
				}
			}
		}
		
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
	
	
	// Write header:
	statusText.textContent = "Writing Header...";
	document.getElementById("setupStuff").setAttribute("class", "hidden");
	document.getElementById("hiddenUntilCreation").removeAttribute("class");
	document.getElementById("vkGetInstanceProcAddrDefine").textContent = vulkanNamespace + "::PFN_vkVoidFunction" + VKAPI_CALL + " vkGetInstanceProcAddr( " + vulkanNamespace + "::Instance instance, const " + s8 + "* pName );";
	
	// Write Handles:
	for(let i = 0; i < handles.length; ++i)
	{
		addLineOfCode(handlesDiv, padTabs(indentation(1) + "typedef struct " + handles[i] + "_Handle*", 60) + handles[i] + ";");
	}
	
	// Write constants:
	for(let i = 0; i < constants.length; ++i)
	{
		let constant = constants[i];
		addLineOfCode(enumsDiv, indentation(1) + "const " + constant.type + " " + constant.name + " = " + constant.value + ";");
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
	
	// Write early function pointers:
	for(let i = 0; i < earlyPfns.length; ++i)
	{
		let earlyPfn = earlyPfns[i];
		addLineOfCode( earlyPfnDiv, indentation(1) + earlyPfn.code);
	}
	
	// Write out structs:
	for (let i = 0; i < structs.length; ++i)
	{
		let struct = structs[i];
		addLineOfCode(structsDiv, indentation(1) + "struct " + struct.name + " {");
		for (let j = 0; j < struct.members.length; ++j)
		{
			addLineOfCode(structsDiv, padTabs(indentation(2) + struct.members[j].type, 57) + struct.members[j].name + ";");
		}
		addLineOfCode(structsDiv, indentation(1) + "};");
		addLineOfCode(structsDiv, indentation(1));
	}
	
	// Write out commands:
	for(let i = 0; i < commands.length; ++i)
	{
		let command = commands[i];
	
		let parametersText = "";
		for(let j=0;j < command.parameters.length; ++j)
		{
			if (j > 0) { parametersText += ", "; }
			let parameter = command.parameters[j];
			parametersText += parameter.preType + parameter.type + parameter.postType + " " + parameter.name;
		}
		
		addLineOfCode( commandTypeDefsDiv, indentation(2) + "typedef " + command.returnType + indentation(2) + "(" + VKAPI_PTR + " *" + command.name + ")(" + parametersText + ");" );
		
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

function addType(typeName)
{
	let found = availableTypes.get(typeName);
	if (found)
	{
		switch(found.category)
		{
			case "struct":
				for (let i = 0; i < found.members.length; ++i)
				{
					// Let's hope there's no circular references in the XML, otherwise this won't complete.
					addType(found.members.type);
				}
				pushIfNew(structs, found);
			break;
			case "handle":
				pushIfNew(handles, found);
			break;
			case  "flag":
				console.log("ignoring flag'" +  found.name + "'it'll be replaced by a basic type anyway.");
			break;
			default:
				console.error("Unknown type category: "  + found.category);
			break;
			
		}		
	}	
	else {	console.error("type not found: " + typeName); }
}


function writeHeaderOld()
{	
	// Find API Constants node
	var enumsNodes = vkxml.getElementsByTagName("enums");
	var apiConstantsNode;
	for(let i = 0; i < enumsNodes.length; ++i)
	{
		var enumsNode = enumsNodes.item(i);
		var enumName = enumsNode.getAttribute("name");
		if (enumName == "API Constants")
		{
			apiConstantsNode = enumsNode;
			break;
		}
	}

	for(let feature of features.values())
	{
		if (!feature.checkbox.checked) { continue; }
		
		for (let requireOrRemove of feature.node.childNodes.values())
		{
			if (requireOrRemove.tagName == "remove")
			{ console.error("feature remove tags aren't supported yet. (They weren't used when this generator was written"); }
			else if (requireOrRemove.tagName == "require")
			{
				for (const tag of requireOrRemove.childNodes.values())
				{
					if (tag.tagName == "command")
					{
						var commandName = tag.getAttribute("name");
						addLineOfCode(symbolList, "command: " + commandName);
					}
					else if (tag.tagName == "enum")
					{
						var enumName = tag.getAttribute("name");
						addLineOfCode(symbolList, "enum: " + enumName);
					}
					else if (tag.tagName == "type")
					{
						var typeName = tag.getAttribute("name");
						addLineOfCode(symbolList, "type: " + typeName);
					}
				}
			}
		}
		
		
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
		}
		
		
	}


	// Vulkan Header:
	
	
	// Types:
	var handles = new Map();
	var funcPointers = new Map();
	var flagTypes = [];
	var structs = new Map();
	
	
	var typesNode = vkxml.getElementsByTagName("types").item(0);
	var typeNodes = typesNode.children;
	for(let i = 0; i < typeNodes.length; ++i)
	{
		var typeNode = typeNodes.item(i);
		var category = typeNode.getAttribute("category");
		
		if (category == "handle")
		{
			var handle = {};
			handle.originalName = typeNode.getElementsByTagName("name").item(0).textContent;
			handle.name = stripVk(handle.originalName);
			handle.code = padTabs( indentation(1) + "typedef struct " + handle.name + "_Handle*", 60 ) + handle.name + ";";
			handles.set(handle.originalName, handle);
			addLineOfCode(handleDefinitions, handle.code);
		}
		else if (category == "funcpointer")
		{
			var funcPointer = {};
			funcPointer.code = indentation(1);
			
			var childNodes = typeNode.childNodes;
			
			for( var j = 0; j < childNodes.length; ++j)
			{
				var textContent = childNodes.item(j).textContent;
				if (childNodes.tagName == "name")
				{
					funcPointer.originalName = textContent;
				}
				
				funcPointer.code +=  stripVk(replaceTypes(replaceFlagTypes(textContent, flagTypes)));
			}
			
			funcPointers.set(funcPointer.originalName, funcPointer);
			
			addLineOfCode(earlyPfnDefinitions, funcPointer.code);
			addLineOfCode(earlyPfnDefinitions, indentation(1));
		}
		else if (category == "bitmask")
		{
			// Add to list so we can replace each occurance:
			var typeChildNodes = typeNode.childNodes;
			for (var j = 0; j < typeChildNodes.length; ++j)
			{
				var typeChildNode = typeChildNodes.item(j);
				if (typeChildNode.tagName == "name")
				{
					var flagName = typeChildNode.textContent;
					flagTypes.push(flagName);
					break;
				}
			}			
		}
		else if (category == "struct" || category == "union")
		{
			var struct = {};
			struct.name = stripVk(typeNode.getAttribute("name"));
			structs.set(struct.name, struct);
			struct.members = [];
				
			addLineOfCode(structDefinitions, indentation(1) + "struct " + struct.name + " {");
			
			var memberNodes = typeNode.children;			
			for(var j = 0; j < memberNodes.length; ++j)
			{
				
				var memberNode = memberNodes.item(j);
				if (memberNode.tagName != "member")
				{
					continue;
				}
				
				var member = "";
				struct.members.push(member);
				
				var lastWasText = false;
				
				var memberTags = memberNode.childNodes;
				for(var h = 0; h < memberTags.length; ++h)
				{
					var memberTag = memberTags.item(h);
					
					switch(memberTag.nodeType)
					{
						case 1:// Element
							if (memberTag.tagName == "type")
							{
								if (lastWasText)
								{
									member += " ";
								}
								member += stripVk(replaceTypes(replaceFlagTypes(memberTag.textContent, flagTypes)));
							}
							else if (memberTag.tagName == "enum")
							{
								member += stripVk(memberTag.textContent);
							}
							else if (memberTag.tagName == "name")
							{
								member = padTabs(member, 57) + memberTag.textContent;
							}
							lastWasText = false;
						break;
						case 3:// Text Node
							member += memberTag.textContent.trim();
							lastWasText = true;
						break;
					}
				}
				
				addLineOfCode(structDefinitions, member + ";");
				
			}
			
			addLineOfCode(structDefinitions, indentation(1) + "};");
			addLineOfCode(structDefinitions, indentation(1));
		}
	}
	addLineOfCode(handleDefinitions, indentation(1));
	
	// constants:
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
				var constantName = constantNode.getAttribute("name");
				var constantValue = constantNode.getAttribute("value");
				var constantType = "u32";
				var typeFound = false;
				
				if (!constantValue){ continue; }
				
				if (constantValue.startsWith("VK_"))
				{
					// Probably an enum alias, skip it:
					continue;
				}
				
				// naive type analysis that only recognizes ULL (unsigned 64), f (float) or " (char* / c-string)
				for(let k = 0; k < constantValue.length; ++k)
				{					
					switch(constantValue[k])
					{
						case 'U':
							if (k > 0 && !isNaN(constantValue[k-1]) && constantValue[k+1] == "L" && constantValue[k+2] == "L")
							{
								constantType = u64;
								typeFound = true;
								break;
							}
						break;
						case 'f':
							constantType = "float";
							typeFound = true;
						break;
						case '"':
							constantType = s8 + "*";
							typeFound = true;
						break;
					}
					if (typeFound) { break; }
				}
				
				addLineOfCode(enumDefinitions, indentation(1) + "const " + constantType + " " + stripVk(constantName) + " = " + constantValue + ";");
			}
			addLineOfCode(enumDefinitions, indentation(1));
		}
		else
		{
			// enum classes
			addLineOfCode( enumDefinitions, indentation(1) + "enum class " + stripVk(enumName));
			addLineOfCode( enumDefinitions, indentation(1) + "{");
			
			var enumType = enumsNode.getAttribute("type");
			var isBitMask = enumType == "bitmask";
			
			var minName = "";
			var minValue = 0;
			var maxName = minName;
			var maxValue = minValue;
			
			var enumEntry = enumsNode.children;
			for(let j = 0; j < enumEntry.length; ++j)
			{
				var constantNode = enumEntry.item(j);
				if (constantNode.tagName != "enum")
				{
					continue;
				}
				
				var constantName = constantNode.getAttribute("name");
				var constantValue = parseInt(constantNode.getAttribute("value"), 10);
				
				if (isBitMask)
				{
					var constantBitPos = constantNode.getAttribute("bitpos");
					if (constantBitPos)
					{
						constantValue = "(1 << " + constantBitPos + ")";
					}
				}
				else if (!constantNode.getAttribute("extends"))
				{
					if (!minName)
					{
						minName = maxName = stripEnumName(enumName, constantName);
						minValue = maxValue = constantValue;
					}
					else if (constantValue < minValue)
					{
						minName = stripEnumName(enumName, constantName);
						minValue = constantValue;
					}
					else if (constantValue > maxValue) 
					{
						maxName = stripEnumName(enumName, constantName);
						maxValue = constantValue;
					}
				}
				
				addLineOfCode(enumDefinitions, padTabs(indentation(2) + stripEnumName(enumName, constantName) + " =", 89) + constantValue + ",");
			}
			if (!isBitMask)
			{
				addLineOfCode( enumDefinitions, padTabs(indentation(2) + "BEGIN_RANGE =", 89) + minName + ",");
				addLineOfCode( enumDefinitions, padTabs(indentation(2) + "END_RANGE =", 89) + maxName + ",");
				addLineOfCode( enumDefinitions, padTabs(indentation(2) + "RANGE_SIZE =", 89) + "(" + maxName + " - " + minName + " + 1),");
			}
			addLineOfCode( enumDefinitions, padTabs(indentation(2) + "MAX_ENUM =", 89) + max_enum);
				
			addLineOfCode( enumDefinitions, indentation(1) + "};");
			addLineOfCode( enumDefinitions, indentation(1));
		}
	}
	
	// Proc Address retrieval implementation:
	var vulkanFunctions = document.createElement("div");
	var functionDefinitions = document.createElement("div");
	var functionRetrieval = document.createElement("div");
	var loadIndependentCommands = document.createElement("div");
	var loadInstanceCommands = document.createElement("div");
	
	vulkanFunctions.setAttribute("id", "vulkanFunctions");
	functionDefinitions.setAttribute("id", "functionDefinitions");
	functionRetrieval.setAttribute("id", "functionRetrieval");
	loadIndependentCommands.setAttribute("id", "loadIndependentCommands");
	loadInstanceCommands.setAttribute("id", "loadInstanceCommands");
	
	addLineOfCode(vulkanFunctions, "// Proc address retrieval implementation:");
	
	addLineOfCode(vulkanFunctions, "#ifdef " + ProccAddrLookupImplDefine);
	addLineOfCode(vulkanFunctions, 'extern "C" ' + VKAPI_ATTR + ' Vk::PFN_vkVoidFunction '+ VKAPI_CALL +' vkGetInstanceProcAddr( Vk::Instance instance, const s8* pName );');
	addLineOfCode(vulkanFunctions, "	");
	vulkanHeader.appendChild(vulkanFunctions);
	vulkanFunctions.appendChild(functionDefinitions);
	vulkanFunctions.appendChild(functionRetrieval);
	addLineOfCode(functionDefinitions, "namespace " + vulkanNamespace);
	addLineOfCode(functionDefinitions, "{");
	
	addLineOfCode(functionRetrieval, "namespace " + newCodeNamespace);
	addLineOfCode(functionRetrieval, "{");
	addLineOfCode(functionRetrieval, indentation(1) +"namespace " + newCodeNamespace2);
	addLineOfCode(functionRetrieval, indentation(1) + "{");
	
	functionRetrieval.appendChild(loadIndependentCommands);
	functionRetrieval.appendChild(loadInstanceCommands);
	addLineOfCode(functionRetrieval, indentation(1) + "}");
	addLineOfCode(functionRetrieval, "}");
	
	addLineOfCode(loadIndependentCommands, indentation(2) + "bool LoadIndependentCommands()");
	addLineOfCode(loadIndependentCommands, indentation(2) + "{");
	
	addLineOfCode(loadInstanceCommands, indentation(2) + "bool LoadInstanceCommands( "+ vulkanNamespace +"::Instance instance)");
	addLineOfCode(loadInstanceCommands, indentation(2) + "{");
	
	// Parse commands
	var commandsNode = vkxml.getElementsByTagName("commands").item(0);
	var commands = commandsNode.getElementsByTagName("command");
	for(let i = 0; i < commands.length; ++i)
	{
		var commandNode = commands.item(i);
		if (!commandNode){ break;}
		var protoNode = commandNode.getElementsByTagName("proto").item(0);
		if (!protoNode){ break;}
		var typeText = stripVk(replaceTypes(protoNode.getElementsByTagName("type").item(0).textContent));
		var nameText = stripVk(protoNode.getElementsByTagName("name").item(0).textContent);
		
		if (nameText == "GetDeviceProcAddr" || nameText == "GetInstanceProcAddr"){ continue; }
		
		// Function pointer signatures (PFN):
		var pfnEntry = document.createElement("div");
		pfnDefinitions.appendChild(pfnEntry);
		pfnEntry.textContent = indentation(2);
		pfnEntry.textContent += "typedef " + 
		typeText + indentation(2) + "(" + VKAPI_PTR + " *" + 
		nameText + ")(";
		
		var commandChildren = commandNode.children;
		var firstParameter = true;
		
		for(let j=0; j < commandChildren.length; ++j)
		{
			var commandChild = commandChildren.item(j);
			if (commandChild.tagName != "param")
			{
				continue;
			}
			
			if (firstParameter) { firstParameter = false; }
			else { pfnEntry.textContent += ", "; }
			
			var nodes = commandChild.childNodes;
			
			for(let k = 0; k < nodes.length; ++k)
			{
				var node = nodes.item(k);
				
				parameterText = stripVk(replaceTypes(replaceFlagTypes( node.textContent, flagTypes)));
				
				pfnEntry.textContent += parameterText;
			}
		}
		
		pfnEntry.textContent += ");"	
		
		// Function defintions:
		var fnDefExt = document.createElement("div");
		var fnDef = document.createElement("div");
				
		functionDefinitionsExt.appendChild(fnDefExt);
		functionDefinitions.appendChild(fnDef);
				
		fnDefExt.textContent = padTabs(indentation(1) + "extern PFN::" + nameText, 68) + nameText + ";";
		fnDef.textContent = padTabs(indentation(1) + " PFN::" + nameText, 68) + nameText + ";";;
		
		if (nameText == "EnumerateInstanceLayerProperties" || nameText == "EnumerateInstanceExtensionProperties" || nameText == "CreateInstance")
		{
			addLineOfCode(loadIndependentCommands, indentation(3) + vulkanNamespace + '::' + nameText + ' = (' + vulkanNamespace + '::PFN::' + nameText + ') vkGetInstanceProcAddr( nullptr, "vk' + nameText + '" );');
			addLineOfCode(loadIndependentCommands, indentation(3) + 'if(!' + vulkanNamespace + '::' +nameText + ') { return false; }');
		}
		else 
		{
			addLineOfCode(loadInstanceCommands, indentation(3) + vulkanNamespace + '::' + nameText + ' = (' + vulkanNamespace + '::PFN::' + nameText + ') vkGetInstanceProcAddr( instance, "vk' + nameText + '" );');
			addLineOfCode(loadInstanceCommands, indentation(3) + 'if(!' + vulkanNamespace + '::' +nameText + ') { return false; }');
		}
	}
	
	// closing braces:
	addLineOfCode(pfnDefinitions, indentation(1) + "}");
	addLineOfCode(functionDefinitionsExt, "}");
	addLineOfCode(functionDefinitions, "}");
	addLineOfCode(loadIndependentCommands, indentation(3) + "return true;");
	addLineOfCode(loadIndependentCommands, indentation(2) + "}");
	addLineOfCode(loadInstanceCommands, indentation(3) + "return true;");
	addLineOfCode(loadInstanceCommands, indentation(2) + "}");
	addLineOfCode(vulkanFunctions, "#endif");
	
	statusText.textContent = "Parsing complete";
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

function stripEnumName(enumName, entryName)
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

function replaceFlagTypes(text, flagTypes)
{
	for(var i = 0; i < flagTypes.length; ++i)
	{
		if (text == flagTypes[i])
		{
			return u32;
		}
	}
	return text;
}

function replaceTypes(text)
{	
	var replaced = text.replace(/\bchar\b/, s8);
	replaced = replaced.replace(/\uint8_t\b/, s8);
	replaced = replaced.replace(/\buint32_t\b/, u32);
	replaced = replaced.replace(/\bint32_t\b/, s32);
	replaced = replaced.replace(/\buint64_t\b/, u64);
	
	replaced = replaced.replace(/\VkSampleMask\b/, u32);
	replaced = replaced.replace(/\bVkBool32\b/, ub32);
	replaced = replaced.replace(/\VKAPI_PTR\b/, VKAPI_PTR);
	
	replaced = replaced.replace(/\DeviceSize\b/, DeviceSize);
	
	replaced = replaced.replace(/\HANDLE\b/, WindowsHandle);
	replaced = replaced.replace(/\HINSTANCE\b/, HINSTANCE);
	replaced = replaced.replace(/\HWND\b/, HWND);
	replaced = replaced.replace(/\SECURITY_ATTRIBUTES\b/, SECURITY_ATTRIBUTES);
	replaced = replaced.replace(/\DWORD\b/, DWORD);
	replaced = replaced.replace(/\LPCWSTR\b/, LPCWSTR);
	
	return replaced;
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

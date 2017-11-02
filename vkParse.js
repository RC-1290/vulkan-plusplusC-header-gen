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
var xhr = new XMLHttpRequest();
var statusText = document.getElementById("statusText");
var symbolList = document.getElementById("symbols");
var vulkanHeader = document.getElementById("vulkanHeader");

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
			parseXml();	
		}
		else 
		{
			statusText.textContent = "xhr failed: " + xhr.statusText;
			console.error("xhr failed: " + xhr.statusText);
		}
	}
}

function parseXml()
{
	var vkxml = xhr.responseXML;	
	
	// Clear placeholder text:
	symbolList.textContent = "";
	vulkanHeader.textContent = "";
	
	// Find API Constants node
	var enumsNodes = vkxml.getElementsByTagName("enums");
	var apiConstantsNode;
	for(var i = 0; i < enumsNodes.length; ++i)
	{
		var enumsNode = enumsNodes.item(i);
		var enumName = enumsNode.getAttribute("name");
		if (enumName == "API Constants")
		{
			apiConstantsNode = enumsNode;
			break;
		}
	}
	
	// Apply extensions:
	var featureNodes = vkxml.getElementsByTagName("feature");
	for(var i = 0; i < featureNodes.length; ++i)
	{
		var featureNode = featureNodes.item(i);
		var featureName = featureNode.getAttribute("api");
		var featureVersion = featureNode.getAttribute("number");
		var featureDescription = featureNode.getAttribute("comment");
		
		addCheckbox(symbolList, featureName, featureDescription, featureName + ", version: " + featureVersion);
		var extensionUl = document.createElement("ul");
		extensionUl.setAttribute("id", "extensionList");
		symbolList.appendChild(extensionUl);

		
		// Extensions:
		var extensionsNode = vkxml.getElementsByTagName("extensions").item(0);
		var extensionNodes = extensionsNode.children;
		for(var j = 0; j < extensionNodes.length; ++j)
		{
			var extensionNode = extensionNodes.item(j);
			
			var extensionSupport = extensionNode.getAttribute("supported");
			if (extensionSupport == "disabled" || extensionSupport != featureName) { continue; }
			
			var extensionName = extensionNode.getAttribute("name");
			var extensionNumber = parseInt(extensionNode.getAttribute("number"));
			var extensionType = extensionNode.getAttribute("type");
			var extensionRequires = extensionNode.getAttribute("requires");
			
			var extensionLi = document.createElement("li");
			extensionUl.appendChild(extensionLi);
			
			addCheckbox(extensionLi, extensionName, extensionName, extensionName + ", Type: " + extensionType);
			
			
			var extensionChildren = extensionNode.children;
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
											var valueAttribute = 1000000000 + offset + (1000 * (extensionNumber - 1))
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
	addLineOfCode(vulkanHeader, "// This header is generated from the Khronos Vulkan XML API Registry,");
	addLineOfCode(vulkanHeader, "// https://github.com/KhronosGroup/Vulkan-Docs/blob/1.0/src/spec/vk.xml");
	addLineOfCode(vulkanHeader, "// The custom header generator was written by Laurens Mathot (@RC_1290).");
	addLineOfCode(vulkanHeader, "// This generated code is also licensed under the Appache License, Version 2.0.");
	addLineOfCode(vulkanHeader, "// http://www.apache.org/licenses/LICENSE-2.0");
	addLineOfCode(vulkanHeader, indentation(1));
	addLineOfCode(vulkanHeader, "#pragma once");
	addLineOfCode(vulkanHeader, indentation(1));
	addLineOfCode(vulkanHeader, "namespace " +vulkanNamespace);
	addLineOfCode(vulkanHeader, "{");
	
	var handleDefinitions = document.createElement("div");
	var enumDefinitions = document.createElement("div");
	var earlyPfnDefinitions = document.createElement("div");
	var structDefinitions = document.createElement("div");
	
	var pfnDefinitions = document.createElement("div");
	var functionDefinitionsExt = document.createElement("div");
	
	addLineOfCode(pfnDefinitions, indentation(1));
	addLineOfCode(pfnDefinitions, indentation(1) + "namespace PFN");
	addLineOfCode(pfnDefinitions, indentation(1) + "{");
	
	vulkanHeader.appendChild(handleDefinitions);
	vulkanHeader.appendChild(enumDefinitions);
	vulkanHeader.appendChild(earlyPfnDefinitions);
	vulkanHeader.appendChild(structDefinitions);
	vulkanHeader.appendChild(pfnDefinitions);
	vulkanHeader.appendChild(functionDefinitionsExt);
	
	// Types:
	var typesNode = vkxml.getElementsByTagName("types").item(0);
	var types = typesNode.children;
	var flagTypes = [];
	
	addLineOfCode(handleDefinitions, indentation(1) + "// Handles: " );
	for(var i = 0; i < types.length; ++i)
	{
		var typeNode = types.item(i);
		var category = typeNode.getAttribute("category");
		
		if (category == "handle")
		{
			var name = stripVk( typeNode.getElementsByTagName("name").item(0).textContent );
			addLineOfCode(handleDefinitions, padTabs( indentation(1) + "typedef struct " + name + "_T*", 60 ) + name + ";");
		}
		else if (category == "funcpointer")
		{
			var funcpointer = indentation(1);
			var childNodes = typeNode.childNodes;
			
			for( var j = 0; j < childNodes.length; ++j)
			{
				funcpointer +=  stripVk(replaceTypes(replaceFlagTypes(childNodes.item(j).textContent, flagTypes)));
			}
			addLineOfCode(earlyPfnDefinitions, funcpointer);
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
			var structName = stripVk(typeNode.getAttribute("name"));
			
			addLineOfCode(structDefinitions, indentation(1) + "struct " + structName + " {");
			
			var memberNodes = typeNode.children;			
			for(var j = 0; j < memberNodes.length; ++j)
			{
				
				var memberNode = memberNodes.item(j);
				if (memberNode.tagName != "member")
				{
					continue;
				}
				
				var codeLine = indentation(2);
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
									codeLine += " ";
								}
								codeLine += stripVk(replaceTypes(replaceFlagTypes(memberTag.textContent, flagTypes)));
							}
							else if (memberTag.tagName == "enum")
							{
								codeLine += stripVk(memberTag.textContent);
							}
							else if (memberTag.tagName == "name")
							{
								codeLine = padTabs(codeLine, 57) + memberTag.textContent;
							}
							lastWasText = false;
						break;
						case 3:// Text Node
							codeLine += memberTag.textContent.trim();
							lastWasText = true;
						break;
					}
				}
				
				addLineOfCode(structDefinitions, codeLine + ";");
				
			}
			
			addLineOfCode(structDefinitions, indentation(1) + "};");
			addLineOfCode(structDefinitions, indentation(1));
		}
	}
	addLineOfCode(handleDefinitions, indentation(1));
	
	// constants:
	for(var i = 0; i < enumsNodes.length; ++i)
	{
		var enumsNode = enumsNodes.item(i);
		var enumName = enumsNode.getAttribute("name");
		if (enumName == "API Constants")
		{
			var constants = enumsNode.children;
			for(var j = 0; j < constants.length; ++j)
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
				for(var k = 0; k < constantValue.length; ++k)
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
			for(var j = 0; j < enumEntry.length; ++j)
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
	
	addLineOfCode(vulkanFunctions, "#ifdef IMPLEMENT_VK_COMMAND_LOOKUP");
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
	for(var i = 0; i < commands.length; ++i)
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
		
		for(var j=0; j < commandChildren.length; ++j)
		{
			var commandChild = commandChildren.item(j);
			if (commandChild.tagName != "param")
			{
				continue;
			}
			
			if (firstParameter) { firstParameter = false; }
			else { pfnEntry.textContent += ", "; }
			
			var nodes = commandChild.childNodes;
			
			for(var k = 0; k < nodes.length; ++k)
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
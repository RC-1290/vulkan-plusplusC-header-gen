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

var vulkanNamespace = "Vk";
var newCodeNamespace = "CodeAnimo";
var newCodeNamespace2 = "Vulkan";
var u32 = "u32";
var u64 = "u64";

var max_enum = "0x7FFFFFFF";

var tab = "	";
var tabSpaceWidth = 4;

// Startup code:
var xhr = new XMLHttpRequest();
var statusText = document.getElementById("statusText");
var vulkanHeader = document.getElementById("vulkanHeader");
var vulkanFunctions = document.getElementById("vulkanFunctions");

statusText.textContent = "Trying to open vk.xml";
var async = true;
xhr.addEventListener("load", onXhrLoad);
xhr.open("GET", "vk.xml", async);
xhr.send();

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
	vulkanHeader.textContent = "";
	vulkanFunctions.textContent = "";
	
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
	var funcPointerDefinitions = document.createElement("div");
	var structDefinitions = document.createElement("div");
	
	var pfnDefinitions = document.createElement("div");
	var functionDefinitionsExt = document.createElement("div");
	
	addLineOfCode(pfnDefinitions, indentation(1));
	addLineOfCode(pfnDefinitions, indentation(1) + "namespace PFN");
	addLineOfCode(pfnDefinitions, indentation(1) + "{");
	
	vulkanHeader.appendChild(handleDefinitions);
	vulkanHeader.appendChild(enumDefinitions);
	vulkanHeader.appendChild(funcPointerDefinitions);
	vulkanHeader.appendChild(structDefinitions);
	vulkanHeader.appendChild(pfnDefinitions);
	vulkanHeader.appendChild(functionDefinitionsExt);
	
	// Types:
	var typesNode = vkxml.getElementsByTagName("types").item(0);
	var types = typesNode.children;
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
		else if (category == "struct")
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
								codeLine += memberTag.textContent;
							}
							else if (memberTag.tagName == "enum")
							{
								codeLine += memberTag.textContent;
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
		else if (category == "union")
		{
			
		}
	}
	addLineOfCode(handleDefinitions, indentation(1));
	
	// constants:
	var enumsNodes = vkxml.getElementsByTagName("enums");
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
				
				// naive type analysis that only recognizes ULL (unsigned 64) or f (float)
				for(var k = 0; k < constantValue.length; ++k)
				{					
					switch(constantValue[k])
					{
						case 'U':
							if (constantValue[k+1] == "L" && constantValue[k+2] == "L")
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
				else 
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
				
				addLineOfCode(enumDefinitions, padTabs(indentation(2) + stripEnumName(enumName, constantName) + " =", 57) + constantValue + ",");
			}
			if (!isBitMask)
			{
				addLineOfCode( enumDefinitions, padTabs(indentation(2) + "BEGIN_RANGE =", 57) + minName + ",");
				addLineOfCode( enumDefinitions, padTabs(indentation(2) + "END_RANGE =", 57) + maxName + ",");
				addLineOfCode( enumDefinitions, padTabs(indentation(2) + "RANGE_SIZE =", 57) + "(" + maxName + " - " + minName + " + 1),");
			}
			addLineOfCode( enumDefinitions, padTabs(indentation(2) + "MAX_ENUM =", 57) + max_enum);
				
			addLineOfCode( enumDefinitions, indentation(1) + "};");
			addLineOfCode( enumDefinitions, indentation(1));
		}
	}
	
	// Proc Address retrieval implementation:
	var functionDefinitions = document.createElement("div");
	var functionRetrieval = document.createElement("div");
	var loadIndependentCommands = document.createElement("div");
	var loadInstanceCommands = document.createElement("div");
	
	addLineOfCode(vulkanFunctions, 'extern "C" VKAPI_ATTR Vk::PFN::VoidFunction VKAPI_CALL vkGetInstanceProcAddr( Vk::Instance instance, const s8* pName );');
	addLineOfCode(vulkanFunctions, "	");
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
		var typeText = stripVk(protoNode.getElementsByTagName("type").item(0).textContent);
		var nameText = stripVk(protoNode.getElementsByTagName("name").item(0).textContent);
		
		if (nameText == "GetDeviceProcAddr" || nameText == "GetInstanceProcAddr"){ continue; }
		
		// Function pointer signatures (PFN):
		var pfnEntry = document.createElement("div");
		pfnDefinitions.appendChild(pfnEntry);
		pfnEntry.textContent = indentation(2);
		pfnEntry.textContent += "typedef " + 
		typeText + "		(VKAPI_PTR *" + 
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
				
				var parameterText = stripVk(node.textContent);
				parameterText = replaceTypes(parameterText);
				
				pfnEntry.textContent += parameterText;
			}
		}
		
		pfnEntry.textContent += ");"	
		
		// Function defintions:
		var fnDefExt = document.createElement("div");
		var fnDef = document.createElement("div");
		
		functionDefinitionsExt.appendChild(fnDefExt);
		functionDefinitions.appendChild(fnDef);
		
		fnDefExt.textContent = indentation(1) + padTabs("extern PFN::" + nameText, 67) + nameText + ";";
		fnDef.textContent = indentation(1) + padTabs(" PFN::" + nameText, 67) + nameText + ";";;
		
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
	
	statusText.textContent = "Parsing complete";
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

function replaceTypes(text)
{
	var replaced = text.replace(/\bchar\b/, "s8");
	replaced = replaced.replace(/\buint32_t\b/, u32);
	replaced = replaced.replace(/\buint64_t\b/, u64);
	replaced = replaced.replace(/\bBool32\b/, "ub32");
	return replaced;
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
	var tabCount = Math.floor((length - text.length) / tabSpaceWidth);
	return text + indentation(tabCount);
}
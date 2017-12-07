# vulkan-plusplusC-header-gen
This parser tries to turn vk.xml into a ++C header file and implementation file. It works on my machine™ (I've been using the latest version of Firefox, other browsers might not have matching tab sizes).

# How to use?
It works like a basic website, but doesn't require hosting.

1. (option a) You can simply use the version hosted on [CodeAnimo.com](http://codeanimo.com/projects/vk_parse/).
2. (option b) Alternatively you can just put all the files in a folder on your desktop (or somewhere else), and visit the html file in your browser. 
3. Provide it with the vk.xml text that you want to process, and click the button to list the features and extensions.
4. Select the features and extensions that you want to include
5. (optional) Adjust settings
6. Click "Create Header"
7. Behold, the header.

# ++C?
This is a reference to Pre-increment being faster than C++ in some situations. I use it to describe a style of programming that is newer than C, but more low-level than C++.

When you use Vulkan headers, you can currently choose between headers that have to support C compilers and headers built on top of that.
The C version uses preprocessor defines left and right, obscuring type information and putting everything in the global namespace with long names.
The C++ version simply includes vulkan.h and its issues, while also including a bunch of C++ Standard Library stuff, templates and operator overloading.
In both cases, it includes the platform headers (e.g.: Windows.h) for you, preventing you from compiling without any further dependencies.

This generator sits somewhere in between C and C++. It uses a couple of C++ features to solve the issues with the C version, while trying to avoid introducing the bulk of the C++ version.
Namespaces and enum classes break up the names into smaller chunks. With the addition of syntax highlighting, that can make it easier to read which specific enum value you use. Code completion system also tend to be better at only listing relevant entries.
It also performs a bunch of type replacement. For example, I like integer types to follow the short format (e.g.: s8, u32, b32, etc.), but that shouldn't be too hard to change if you have different preferences.
You could just make it include windows.h, but if you've written custom Windows headers, you can do things like compiling without the C Runtime Library.

It also lets you selectively include extensions. Who knows, perhaps you just want a smaller header or something. Or perhaps you want to have a separate header for each platform, removing even the #ifdef'd away code from the other platforms.

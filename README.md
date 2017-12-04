# vulkan-plusplusC-header-gen
This parser tries to turn vk.xml into a ++C header file and implementation file. It works on my machine™.

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

Lastly (I think) it lets you selectively include extensions.

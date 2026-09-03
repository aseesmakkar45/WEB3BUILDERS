import sys
sys.path = [p for p in sys.path if "AppData\\Roaming" not in p]

from swytchcode_runtime import Swytchcode
import asyncio
import traceback

async def main():
    with open("swytchcode_out.txt", "w") as f:
        swy = Swytchcode()
        # List methods
        try:
            methods = swy.tools
            f.write(f"Available tools: {methods}\n")
        except Exception as e:
            f.write(f"Error getting tools: {e}\n{traceback.format_exc()}\n")

        import swytchcode_runtime.discover as discover
        try:
            res = discover.search("")
            f.write(f"\nDiscover search results: {res}\n")
        except Exception as e:
            f.write(f"Error discovering tools: {e}\n{traceback.format_exc()}\n")

        try:
            from swytchcode_runtime import schema
            f.write(f"\nSchema available: {dir(schema)}\n")
        except Exception as e:
            f.write(f"Error schema: {e}\n{traceback.format_exc()}\n")

if __name__ == "__main__":
    asyncio.run(main())

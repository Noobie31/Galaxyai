export const transloadit = {
    upload: async (file: File) => {
        console.log("Uploading file to Transloadit:", file.name);
        return { url: "https://example.com/file" };
    }
};

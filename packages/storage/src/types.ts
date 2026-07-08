export interface StorageProvider {
  /**
   * Uploads a file to the storage provider.
   * @param key Unique key/path for the file in storage.
   * @param body The file content as a Buffer.
   * @param contentType The MIME type of the file.
   */
  upload(key: string, body: Buffer, contentType: string): Promise<{ key: string; url: string }>

  /**
   * Deletes a file from the storage provider.
   * @param key Unique key/path of the file to delete.
   */
  delete(key: string): Promise<void>

  /**
   * Generates a temporary signed URL for downloading/viewing the file.
   * @param key Unique key/path of the file.
   * @param expiresIn Expiration time in seconds.
   */
  getSignedUrl(key: string, expiresIn: number): Promise<string>

  /**
   * Gets the public URL of the file. Returns empty string if files are private.
   * @param key Unique key/path of the file.
   */
  getPublicUrl(key: string): string
}

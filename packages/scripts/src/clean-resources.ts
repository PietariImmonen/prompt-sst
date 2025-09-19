import { User } from "@sst-replicache-template/core/domain/user";
import { UserSettings } from "@sst-replicache-template/core/domain/user-settings";
import { Workspace } from "@sst-replicache-template/core/domain/workspace";

const workspaces = await Workspace.list();

const users = await User.listAll();
const userSettings = await UserSettings.listAll();

/**
 * Deletes all items where the corresponding workspaceID doesn't exist anymore.
 * Each of the domain models has a workspaceID field that references a workspace.
 * This function removes orphaned records where the referenced workspace no longer exists.
 */
async function cleanOrphanedResources() {
  // Create a set of existing workspace IDs for faster lookups
  const existingWorkspaceIds = new Set(
    workspaces.map((workspace) => workspace.id),
  );

  console.log(`Found ${existingWorkspaceIds.size} existing workspaces`);

  // Helper function to filter and delete orphaned resources with object parameter
  async function cleanResourceTypeWithObject<
    T extends { id: string; workspaceID?: string },
  >(
    resourceName: string,
    resources: T[],
    deleteFunction: (input: { id: string }) => Promise<unknown>,
  ) {
    const orphanedResources = resources.filter(
      (resource) =>
        resource.workspaceID && !existingWorkspaceIds.has(resource.workspaceID),
    );

    console.log(`Found ${orphanedResources.length} orphaned ${resourceName}`);

    if (orphanedResources.length > 0) {
      console.log(
        `Deleting ${orphanedResources.length} orphaned ${resourceName}...`,
      );

      for (const resource of orphanedResources) {
        try {
          await deleteFunction({ id: resource.id });
          console.log(`Deleted ${resourceName} with ID: ${resource.id}`);
        } catch (error) {
          console.error(
            `Failed to delete ${resourceName} with ID: ${resource.id}`,
            error,
          );
        }
      }

      console.log(`Finished deleting orphaned ${resourceName}`);
    }
  }

  // Helper function to filter and delete orphaned resources with string parameter
  async function cleanResourceTypeWithString<
    T extends { id: string; workspaceID?: string },
  >(
    resourceName: string,
    resources: T[],
    deleteFunction: (id: string) => Promise<unknown>,
  ) {
    const orphanedResources = resources.filter(
      (resource) =>
        resource.workspaceID && !existingWorkspaceIds.has(resource.workspaceID),
    );

    console.log(`Found ${orphanedResources.length} orphaned ${resourceName}`);

    if (orphanedResources.length > 0) {
      console.log(
        `Deleting ${orphanedResources.length} orphaned ${resourceName}...`,
      );

      for (const resource of orphanedResources) {
        try {
          await deleteFunction(resource.id);
          console.log(`Deleted ${resourceName} with ID: ${resource.id}`);
        } catch (error) {
          console.error(
            `Failed to delete ${resourceName} with ID: ${resource.id}`,
            error,
          );
        }
      }

      console.log(`Finished deleting orphaned ${resourceName}`);
    }
  }

  // User.remove takes a string id
  await cleanResourceTypeWithString("users", users, User.removeCompletely);

  // For models that have remove methods with object parameter

  await cleanResourceTypeWithString(
    "user settings",
    userSettings,
    UserSettings.remove,
  );

  console.log("Resource cleanup completed");
}

// Execute the cleanup function
await cleanOrphanedResources();

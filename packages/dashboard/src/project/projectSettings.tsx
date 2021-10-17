import { InputFieldLabel, Paper } from '@sorry-cypress/dashboard/components';
import {
  CreateProjectInput,
  UpdateProjectInput,
  useCreateProjectMutation,
  useGetProjectQuery,
  useUpdateProjectMutation,
} from '@sorry-cypress/dashboard/generated/graphql';
import {
  getProjectPath,
  NavItemType,
  setNav,
} from '@sorry-cypress/dashboard/lib/navigation';
import { Alert, Button, Cell, Grid, Text, TextField } from 'bold-ui';
import React, { useLayoutEffect, useState } from 'react';
import { CirclePicker } from 'react-color';
import { Controller, useForm } from 'react-hook-form';
import { useHistory } from 'react-router-dom';
import { useHooksFormReducer, WithHooksForm } from './hook/hookFormReducer';
import { useCurrentProjectId } from './hook/useCurrentProjectId';

const DEFAULT_TIMEOUT_SECONDS = 600;

export function ProjectSettings() {
  return (
    <WithHooksForm>
      <_ProjectSettings />
    </WithHooksForm>
  );
}

interface ProjectFormFields {
  projectId: string;
  inactivityTimeoutMinutes: number;
  projectColor: string;
}
function _ProjectSettings() {
  const projectId = useCurrentProjectId();
  const { control, register, handleSubmit, errors, reset } = useForm<
    ProjectFormFields
  >({
    mode: 'onChange',
    defaultValues: {
      projectId: '',
      inactivityTimeoutMinutes: DEFAULT_TIMEOUT_SECONDS / 60,
    },
  });
  const history = useHistory();
  const isNewProject = projectId === '--create-new-project--';
  const [_, dispatch] = useHooksFormReducer();

  useLayoutEffect(() => {
    if (isNewProject) {
      setNav([
        {
          type: NavItemType.newProject,
          label: 'New project',
        },
      ]);
    } else {
      setNav([
        {
          label: projectId,
          type: NavItemType.project,
          link: getProjectPath(projectId),
        },
        {
          type: NavItemType.projectSettings,
          label: 'Project Settings',
        },
      ]);
    }
  }, [isNewProject]);

  const [notification, setNotification] = useState<string | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);

  const [
    startCreateProjectMutation,
    { loading: creating },
  ] = useCreateProjectMutation();
  const [
    startUpdateProjectMutation,
    { loading: updating },
  ] = useUpdateProjectMutation();

  const { loading, error, data } = useGetProjectQuery({
    variables: {
      projectId: projectId,
    },
    onCompleted: (data) => {
      if (!data?.project) {
        return;
      }
      dispatch({
        type: 'SET_STATE',
        payload: {
          hooks: data.project.hooks,
        },
      });
      reset({
        projectId: decodeURIComponent(data?.project.projectId),
        inactivityTimeoutMinutes: Math.ceil(
          (data?.project.inactivityTimeoutSeconds ?? DEFAULT_TIMEOUT_SECONDS) /
            60
        ),
        projectColor: data?.project.projectColor || '',
      });
    },
  });

  async function updateProject(input: UpdateProjectInput) {
    try {
      const result = await startUpdateProjectMutation({
        variables: {
          input: { ...input, projectId },
        },
      });
      if (result.errors) {
        setOperationError(result.errors[0].message);
      } else {
        setNotification('Project Saved!');
      }
    } catch (error: any) {
      setOperationError(error.toString());
    }
  }

  async function createProject(project: CreateProjectInput) {
    try {
      const result = await startCreateProjectMutation({
        variables: {
          project,
        },
      });

      if (result.errors) {
        return setOperationError(result.errors[0].message);
      }
      if (!result.data?.createProject) {
        return setOperationError('No project returned');
      }

      setNotification('Project Created!');
      setProjectJustCreated(true);
      history.push(`/${result.data?.createProject.projectId}/edit`);
    } catch (error: any) {
      setOperationError(error.toString());
    }
  }

  if (!isNewProject) {
    if (loading) return <p>Loading...</p>;
    if (error) return <p>{error.toString()}</p>;
    if (!data) {
      return <p>No data</p>;
    }
    if (!data.project) {
      return <p>Not a recognized project</p>;
    }
  }

  const onSubmit = (data: ProjectFormFields) => {
    if (isNewProject) {
      createProject({
        projectId: data.projectId,
        inactivityTimeoutSeconds:
          data.inactivityTimeoutMinutes * 60 ?? DEFAULT_TIMEOUT_SECONDS,
        projectColor: data?.projectColor,
      });
    } else {
      updateProject({
        projectId: data.projectId,
        inactivityTimeoutSeconds:
          data.inactivityTimeoutMinutes * 60 ?? DEFAULT_TIMEOUT_SECONDS,
        projectColor: data?.projectColor,
      });
    }
  };

  const disabled = creating || updating || loading;
  const hasErrors = Object.keys(errors).length > 0;

  return (
    <Paper>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Grid wrap>
          <Cell xs={12}>
            {operationError ? (
              <Alert type="danger" onCloseClick={() => setOperationError(null)}>
                {operationError}
              </Alert>
            ) : null}
            {notification && (
              <Alert type="success" onCloseClick={() => setNotification(null)}>
                {notification}
              </Alert>
            )}
          </Cell>
          <Cell xs={12} sm={6}>
            <InputFieldLabel
              required
              // htmlFor="projectId"
              label="Project Id"
              helpText="This is the 'projectId' value from cypress.json."
              error={true}
              // errorMessage={errors['projectId']?.message}
            >
              <TextField
                inputRef={register({
                  required: {
                    value: true,
                    message: 'Project id is required',
                  },
                })}
                name="projectId"
                placeholder='Enter your "projectId"'
                disabled={!isNewProject || disabled}
              />
            </InputFieldLabel>
          </Cell>
          <Cell xs={12} sm={6}>
            <InputFieldLabel
              // htmlFor="inactivityTimeoutMinutes"
              label="Runs Timeout (minutes)"
              helpText="Runs exceeding this value will be considered as timed out"
              required
              // error={errors['inactivityTimeoutMinutes']?.message}
            >
              <TextField
                name="inactivityTimeoutMinutes"
                placeholder="Runs timeout in minutes"
                type="number"
                inputRef={register({
                  valueAsNumber: true,
                  required: {
                    value: true,
                    message: 'Runs timeout is required',
                  },
                  max: {
                    value: 720,
                    message: 'Max value is 720 minutes (12 hours)',
                  },
                  min: {
                    value: 1,
                    message: 'Min value is 1 minute',
                  },
                })}
                disabled={disabled}
              />
            </InputFieldLabel>
          </Cell>
          <Cell xs={12}>
            <InputFieldLabel
              // htmlFor="projectColor"
              label="Project Color"
              helpText="A color to easily differentiate this project from others"
              // error={errors['projectColor']?.message}
            >
              <Controller
                control={control}
                render={({ onChange, value }) => (
                  <CirclePicker
                    circleSize={20}
                    color={value}
                    onChange={(color) => onChange(color.hex)}
                  />
                )}
                name="projectColor"
                defaultValue=""
              />
              {errors.projectColor && <Text>{errors.projectColor}</Text>}
            </InputFieldLabel>
          </Cell>
          <Cell
            style={{ display: 'flex', justifyContent: 'flex-end' }}
            size={12}
          >
            <Button
              type="submit"
              kind="primary"
              disabled={disabled || hasErrors}
            >
              {isNewProject ? 'Create Project' : 'Save Settings'}
            </Button>
          </Cell>
        </Grid>
      </form>
    </Paper>
  );
}

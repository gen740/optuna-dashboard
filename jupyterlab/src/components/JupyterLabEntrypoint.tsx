import RestartAltIcon from "@mui/icons-material/RestartAlt"
import StartIcon from "@mui/icons-material/Start"
import {
  Box,
  Button,
  CssBaseline,
  FormControl,
  ThemeProvider,
  Typography,
  createTheme,
  useTheme,
} from "@mui/material"
import CircularProgress from "@mui/material/CircularProgress"
import { blue, pink } from "@mui/material/colors"
import {
  APIClientProvider,
  App,
  ConstantsContext,
} from "@optuna/optuna-dashboard"
import { SnackbarProvider, enqueueSnackbar } from "notistack"
import React, {
  Dispatch,
  FC,
  SetStateAction,
  useEffect,
  useState,
  useMemo,
} from "react"
import { JupyterlabAPIClient } from "../apiClient"
import { requestAPI } from "../handler"
import { DebouncedInputTextField } from "./Debounce"

const jupyterlabAPIClient = new JupyterlabAPIClient()

export const JupyterLabEntrypoint: FC = () => {
  const [ready, setReady] = useState(false)
  const [pathName, setPathName] = useState("")

  // JupyterLab's theme switching is handled by setting CSS variables (ref: https://github.com/jupyterlab/jupyterlab/issues/4919#issuecomment-405757623).
  // Therefore, the implementation of determining whether JupyterLab is in dark or light mode should rely on these CSS variables.
  // The CSS variable used is defined here: https://github.com/jupyterlab/jupyterlab/blob/d470c501f50ad7075413cd89967a1a8a332b9a2f/packages/theme-light-extension/style/variables.css#L36
  const colorMode =
    getComputedStyle(
      document.querySelector(":root") as Element
    ).getPropertyValue("--jp-shadow-base-lightness") === "0"
      ? "light"
      : "dark"
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: colorMode,
          primary: blue,
          secondary: pink,
        },
      }),
    [colorMode]
  )
  useEffect(() => {
    setPathName(window.location.pathname)
  }, [])

  if (!ready) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <SnackbarProvider maxSnack={3}>
          <Box
            sx={{
              minHeight: "100vh",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: theme.palette.background.default,
            }}
          >
            <JupyterLabStartWidget
              showOptunaDashboard={() => {
                setReady(true)
              }}
            />
          </Box>
        </SnackbarProvider>
      </ThemeProvider>
    )
  }
  return (
    <ConstantsContext.Provider
      value={{
        color_mode: colorMode,
        environment: "jupyterlab",
        url_prefix: pathName,
      }}
    >
      <APIClientProvider apiClient={jupyterlabAPIClient}>
        <App />
      </APIClientProvider>
    </ConstantsContext.Provider>
  )
}

const JupyterLabStartWidget: FC<{
  showOptunaDashboard: () => void
}> = ({ showOptunaDashboard }) => {
  const [loading, setLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    setLoading(true)
    requestAPI<{ is_initialized: boolean }>("/api/is_initialized", {
      method: "GET",
    })
      .then((res) => {
        setIsInitialized(res.is_initialized)
        setLoading(false)
      })
      .catch((err) => {
        setLoading(false)
        enqueueSnackbar("Failed to check the initialized state", {
          variant: "error",
        })
        console.error(err)
      })
  }, [])

  if (loading) {
    return (
      <Box
        sx={{
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <CircularProgress />
      </Box>
    )
  }

  if (isInitialized) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          width: "600px",
          borderRadius: "8px",
          boxShadow: "rgba(0, 0, 0, 0.08) 0 8px 24px",
          padding: "64px",
        }}
      >
        <Typography variant="h4">Continue or Reset?</Typography>
        <Typography sx={{ margin: "8px 0" }}>
          Continue with the existing storage URL and artifact path settings, or
          you can reset them.
        </Typography>
        <Button
          variant="contained"
          onClick={showOptunaDashboard}
          color="primary"
          startIcon={<StartIcon />}
          sx={{ margin: "8px 0", minWidth: "120px" }}
        >
          Continue
        </Button>
        <Button
          variant="outlined"
          onClick={() => {
            setIsInitialized(false)
          }}
          color="primary"
          startIcon={<RestartAltIcon />}
          sx={{ margin: "8px 0", minWidth: "120px" }}
        >
          Reset
        </Button>
      </Box>
    )
  }

  return (
    <StartDashboardForm
      showOptunaDashboard={showOptunaDashboard}
      setLoading={setLoading}
    />
  )
}

const StartDashboardForm: FC<{
  showOptunaDashboard: () => void
  setLoading: Dispatch<SetStateAction<boolean>>
}> = ({ showOptunaDashboard, setLoading }) => {
  const theme = useTheme()
  const isDarkMode = theme.palette.mode === "dark"
  const [storageURL, setStorageURL] = useState("")
  const [artifactPath, setArtifactPath] = useState("")
  const [isValidURL, setIsValidURL] = useState(false)

  const handleValidateURL = (url: string): void => {
    setIsValidURL(url !== "")
  }

  const handleCreateNewDashboard = () => {
    setLoading(true)
    requestAPI<{ is_initialized: boolean }>("/api/register_dashboard_app", {
      method: "POST",
      body: JSON.stringify({
        storage_url: storageURL,
        artifact_path: artifactPath,
      }),
    })
      .then((_res) => {
        setLoading(false)
        showOptunaDashboard()
      })
      .catch((err) => {
        setLoading(false)
        enqueueSnackbar("Failed to initialize Optuna Dashboard", {
          variant: "error",
        })
        console.error(err)
      })
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        width: "600px",
        borderRadius: "8px",
        boxShadow: isDarkMode
          ? "rgba(255, 255, 255, 0.08) 0 8px 24px"
          : "rgba(0, 0, 0, 0.08) 0 8px 24px",
        padding: "64px",
      }}
    >
      <Typography variant="h4">Initialize Dashboard</Typography>
      <Typography sx={{ margin: "8px 0" }}>
        Please enter a storage URL and an artifact path.
      </Typography>
      <FormControl>
        <DebouncedInputTextField
          onChange={(s) => {
            handleValidateURL(s)
            setStorageURL(s)
          }}
          delay={500}
          textFieldProps={{
            autoFocus: true,
            fullWidth: true,
            label: "Storage URL",
            type: "text",
            sx: { margin: "8px 0" },
          }}
        />
      </FormControl>
      <FormControl>
        <DebouncedInputTextField
          onChange={(s) => {
            setArtifactPath(s)
          }}
          delay={500}
          textFieldProps={{
            fullWidth: true,
            label: "Artifact path (Optional)",
            type: "text",
            sx: { margin: "8px 0" },
          }}
        />
      </FormControl>
      <Button
        variant="contained"
        onClick={handleCreateNewDashboard}
        color="primary"
        disabled={!isValidURL}
        sx={{ margin: "8px 0" }}
      >
        Create
      </Button>
    </Box>
  )
}

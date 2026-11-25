{{- define "customer.labels" -}}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- with .Values.customLabels }}
{{ toYaml . }}
{{- end }}
{{- end }}
